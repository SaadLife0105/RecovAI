// reset-patient-password — Phase 7 (Final-Edits-and-Fixes.md).
//
// Called by a logged-in doctor from patient/[id].tsx's Overview tab. Sets a
// new password on an assigned patient's auth.users row using the service
// role.
//
// This exists because patients CANNOT use Supabase's own password-recovery
// email: they log in with a synthetic {username}@patients.recovai.internal
// address that has no real inbox (see create-patient/index.ts and the
// 0001_initial_schema.sql header). Delivering a reset link to the real
// contact_email captured at onboarding would need a verified sending domain
// — the same Resend/domain-verification overhead Development Plan.md's
// Phase 6 entry already weighed and deliberately dropped. A doctor-mediated
// reset is the honest prototype-scale alternative: the doctor already
// relays the patient's initial credentials at account creation, so this is
// the same trust path, not a new one.
//
// Two authorization checks, not one. create-patient only needs "is the
// caller an active doctor?" because it creates a brand-new row owned by
// that caller. This function mutates an EXISTING account, so it must also
// confirm the target patient is actually assigned to the calling doctor —
// otherwise any doctor could reset any patient's password by guessing an id.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ResetPatientPasswordBody {
  patientId: string;
  newPassword: string;
}

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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // --- Step 1: verify the caller is a real, logged-in, non-archived doctor ---
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

  const { data: callerProfile, error: callerProfileError } = await callerClient
    .from('profiles')
    .select('role, archived')
    .eq('id', callerData.user.id)
    .single();

  if (callerProfileError || !callerProfile || callerProfile.role !== 'doctor' || callerProfile.archived) {
    return jsonResponse({ error: 'Only an active doctor account can reset a patient password' }, 403);
  }

  const doctorId = callerData.user.id;

  // --- Step 2: validate the request body ---
  let body: ResetPatientPasswordBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const patientId = body.patientId?.trim();
  const { newPassword } = body;

  if (!patientId) return jsonResponse({ error: 'patientId is required' }, 400);
  if (!newPassword || newPassword.length < 8) {
    return jsonResponse({ error: 'newPassword must be at least 8 characters' }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --- Step 3: confirm the target is this doctor's own assigned patient ---
  // Deliberately via adminClient, not callerClient: reading through RLS would
  // make "not assigned to you" and "does not exist" both surface as an empty
  // result, and the explicit ownership comparison below is the check we
  // actually want to be able to reason about.
  const { data: patientProfile, error: patientProfileError } = await adminClient
    .from('profiles')
    .select('role, assigned_doctor_id')
    .eq('id', patientId)
    .maybeSingle();

  if (patientProfileError) {
    return jsonResponse({ error: `Could not look up patient: ${patientProfileError.message}` }, 500);
  }

  // One deliberately vague message for all three failure shapes (no such
  // profile / not a patient / assigned to a different doctor) — distinct
  // errors here would let a doctor probe which ids exist.
  if (
    !patientProfile ||
    patientProfile.role !== 'patient' ||
    patientProfile.assigned_doctor_id !== doctorId
  ) {
    return jsonResponse({ error: 'That patient is not assigned to you' }, 403);
  }

  // --- Step 3b: refuse if the patient now manages their own password ---
  // Once a patient swaps their synthetic login address for a real email
  // (sync-patient-login-email), they own Supabase's normal recovery flow, and a
  // doctor must no longer be able to override their password. This is a genuine
  // security boundary now, enforced here regardless of whether the doctor UI
  // still happens to show the button.
  const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(patientId);
  if (targetUserError || !targetUser.user) {
    return jsonResponse({ error: 'Could not look up the patient account' }, 500);
  }
  if (!targetUser.user.email?.endsWith('@patients.recovai.internal')) {
    return jsonResponse(
      { error: 'This patient has set up their own email and can reset their own password.' },
      403
    );
  }

  // --- Step 4: set the new password ---
  const { error: updateError } = await adminClient.auth.admin.updateUserById(patientId, {
    password: newPassword,
  });

  if (updateError) {
    return jsonResponse({ error: `Failed to reset password: ${updateError.message}` }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
