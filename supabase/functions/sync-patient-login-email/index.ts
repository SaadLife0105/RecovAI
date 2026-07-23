// sync-patient-login-email — patient self-service password reset (Phase 7).
//
// When a patient sets a real contact_email (onboarding's email step, or
// edit-profile's Save), their ACTUAL Supabase Auth identity email is swapped
// to match, so they can use Supabase's own password-recovery flow exactly like
// a doctor does — instead of depending on a doctor-mediated reset.
//
// Why the admin API and not a plain client-side auth.updateUser({ email }):
// that client call triggers Supabase's email-CHANGE confirmation flow (a link
// mailed to the new address, which must be clicked before it takes effect).
// We don't want that round-trip — the patient already proved who they are by
// being logged in. admin.updateUserById(..., { email_confirm: true }) sets the
// verified email instantly.
//
// Security boundary: the target user id is derived from the CALLER'S OWN JWT
// only. There is deliberately no patientId parameter — this function can only
// ever change the caller's own identity email, never anyone else's.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface SyncEmailBody {
  email: string;
}

// Permissive on purpose — a server-side sanity check against garbage, not RFC
// 5322 adjudication. Mirrors the client-side LOOKS_LIKE_EMAIL in onboarding.tsx
// so validation exists on both sides (never trust the client alone).
const LOOKS_LIKE_EMAIL = /^\S+@\S+\.\S+$/;

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

  // --- Verify the caller is authenticated, and pin the target to the caller ---
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

  // The one and only user this call can ever touch: the caller themselves.
  const userId = callerData.user.id;

  // --- Validate the body (server-side, not just trusting the client) ---
  let body: SyncEmailBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const email = body.email?.trim();
  if (!email || !LOOKS_LIKE_EMAIL.test(email)) {
    return jsonResponse({ error: 'A valid email is required' }, 400);
  }

  // --- Swap the identity email, verified, with no confirmation round-trip ---
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });

  if (updateError) {
    return jsonResponse({ error: `Failed to sync login email: ${updateError.message}` }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
