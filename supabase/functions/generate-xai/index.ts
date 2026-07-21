// generate-xai — Explainable-AI alert Edge Function (FR, Development Plan.md
// §4.4; Chapter 2 §2.9.2). Generates a short plain-English clinical note
// explaining WHICH factors drove a high risk score, and files it as a
// doctor-facing alert.
//
// Phase 5 refactor: the two halves of this function now live in
// _shared/xaiExplanation.ts (text generation) and _shared/doctorAlert.ts
// (alert row + push), because risk-agent's tools need them independently.
// This file is now a thin wrapper preserving the original behaviour and
// response shape exactly.
//
// Nothing in the app calls this endpoint any more — check-in.tsx now calls
// risk-agent instead (§5.0 point 1). It's kept as a standalone endpoint
// because it is exactly what a future manual "regenerate explanation" doctor
// action would need.
//
// Operates on the CALLER'S OWN data only — there is no patientId param, so it
// is structurally impossible to generate an explanation about someone else's
// data.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateXaiExplanation } from '../_shared/xaiExplanation.ts';
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
    return jsonResponse({ error: 'Only an active patient account can generate an explanation' }, 403);
  }

  const assignedDoctorId = callerProfile.assigned_doctor_id;
  if (!assignedDoctorId) {
    // No doctor to alert — nothing to do. Clear error rather than a silent success.
    return jsonResponse({ error: 'No assigned doctor to alert.' }, 400);
  }

  // --- Step 2: generate the explanation ---
  const result = await generateXaiExplanation(callerClient, patientId);
  if ('error' in result) {
    // Same status split as before the refactor: missing data is the caller's
    // problem (400), anything else is ours/Anthropic's (502).
    const isDataProblem = result.error.startsWith('No check-in data');
    return jsonResponse({ error: result.error }, isDataProblem ? 400 : 502);
  }

  // --- Step 3: file the alert + best-effort push ---
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const alertResult = await sendDoctorAlert({
    callerClient,
    serviceRoleClient: serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null,
    patientId,
    doctorId: assignedDoctorId,
    type: 'high_risk_score',
    urgency: 'high',
    explanation: result.explanation,
  });

  if ('error' in alertResult) {
    return jsonResponse({ error: alertResult.error }, 500);
  }

  return jsonResponse({ explanation: result.explanation, alertId: alertResult.alertId }, 200);
});
