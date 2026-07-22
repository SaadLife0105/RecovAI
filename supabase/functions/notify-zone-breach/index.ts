// notify-zone-breach — turns a recorded zone breach into a doctor-facing
// alert (Development Plan.md §6). Called by lib/backgroundLocationTask.ts
// immediately after a zone_breaches row is successfully inserted, which is
// the only real-time writer of that table.
//
// Caller-authenticated by a logged-in PATIENT — same pattern as
// generate-xai (verify the Authorization header, verify the caller is an
// active patient with an assigned doctor). The zone is read through the
// caller-scoped client, so risk_zones' own "patient reads own zones" policy
// is what stops a patient naming someone else's zone id.
//
// RESTRAINT: only medium_risk and high_risk zones alert. A breach of a safe
// or low_risk zone is still recorded as a zone_breaches row, but never
// notifies — a doctor who gets pinged every time a patient walks past a
// low-risk location stops reading the pings that matter (the alert-fatigue
// concern this project weighs everywhere else). Returning 200 with
// alerted: false for those is the normal path, not a failure.
//
// ---------------------------------------------------------------------------
// DEPLOYMENT — manual steps for Sa'ad to run (not automated here):
//
//   supabase functions deploy notify-zone-breach
//
//   No new secrets and no config.toml entry: this is a normal caller-
//   authenticated function, so it keeps the platform's default
//   verify_jwt = true, and it reuses SUPABASE_SERVICE_ROLE_KEY (already set)
//   for the push step inside sendDoctorAlert.
// ---------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendDoctorAlert } from '../_shared/doctorAlert.ts';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // --- Step 1: verify the caller is a real, logged-in, non-archived patient ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const patientId = callerData.user.id;

  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from('profiles')
    .select('role, archived, assigned_doctor_id')
    .eq('id', patientId)
    .single();

  if (callerProfileError || !callerProfile || callerProfile.role !== 'patient' || callerProfile.archived) {
    return jsonResponse({ error: 'Only an active patient account can report a zone breach' }, 403);
  }

  const assignedDoctorId = callerProfile.assigned_doctor_id;
  if (!assignedDoctorId) {
    return jsonResponse({ error: 'No assigned doctor to alert.' }, 400);
  }

  // --- Step 2: the zone (caller-scoped — RLS does the ownership check) ---
  let zoneId: string | undefined;
  try {
    zoneId = (await req.json())?.zoneId;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }
  if (!zoneId) {
    return jsonResponse({ error: 'zoneId is required' }, 400);
  }

  const { data: zone } = await callerClient
    .from('risk_zones')
    .select('label, classification')
    .eq('id', zoneId)
    .eq('patient_id', patientId)
    .single();

  // Bad id or someone else's zone — RLS makes both look identical from here.
  if (!zone) {
    return jsonResponse({ error: 'Zone not found' }, 404);
  }

  // --- Step 3: restraint gate. safe / low_risk never alert. ---
  if (zone.classification !== 'medium_risk' && zone.classification !== 'high_risk') {
    return jsonResponse({ alerted: false, reason: 'zone not dangerous enough to alert' }, 200);
  }

  // --- Step 4: alert + best-effort push (preference-gated inside) ---
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const alertResult = await sendDoctorAlert({
    callerClient,
    // Needed for the push step — a patient can't read their doctor's
    // push_tokens (or notification preferences) under RLS.
    serviceRoleClient: serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null,
    patientId,
    doctorId: assignedDoctorId,
    type: 'zone_breach',
    urgency: zone.classification === 'high_risk' ? 'high' : 'medium',
    explanation: `Patient entered a flagged zone: ${zone.label} (${zone.classification}).`,
  });

  if ('error' in alertResult) {
    return jsonResponse({ error: alertResult.error }, 500);
  }

  return jsonResponse({ alerted: true, alertId: alertResult.alertId }, 200);
});
