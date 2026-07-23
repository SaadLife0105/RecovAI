// One-off backfill — sync existing patients' Auth identity email to their
// contact_email. (Phase 7, patient self-service password reset.)
//
// Any patient who set a contact_email BEFORE the sync-patient-login-email
// function existed still has the synthetic {username}@patients.recovai.internal
// login address, so they can't yet reset their own password. This walks every
// patient with a non-null contact_email and, if their identity email is still
// synthetic, swaps it — the same admin.updateUserById(..., email_confirm: true)
// the live function does per-save. Postgres can't call Supabase's admin API, so
// this has to run as a script, not as part of the SQL migration.
//
// It is idempotent: patients already swapped (real, non-synthetic email) are
// skipped, so re-running is safe.
//
// HOW TO RUN (service-role key required — never commit it):
//   1. Grab the service_role key from the Supabase dashboard:
//        Project Settings → API → Project API keys → service_role (reveal).
//   2. From the repo root, with the key set ONLY for this one command:
//        SUPABASE_URL="https://<project-ref>.supabase.co" \
//        SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
//        node supabase/scripts/backfill-patient-login-emails.mjs
//      (On Windows PowerShell:
//        $env:SUPABASE_URL="https://<project-ref>.supabase.co";
//        $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>";
//        node supabase/scripts/backfill-patient-login-emails.mjs )
//   3. Confirm the printed summary (synced / skipped / failed) looks right.
//
// SUPABASE_URL is the same value as EXPO_PUBLIC_SUPABASE_URL in your .env.

import { createClient } from '@supabase/supabase-js';

const SYNTHETIC_EMAIL_DOMAIN = '@patients.recovai.internal';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running (see header).'
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

const { data: patients, error } = await admin
  .from('profiles')
  .select('id, contact_email')
  .eq('role', 'patient')
  .not('contact_email', 'is', null);

if (error) {
  console.error(`Could not read patients: ${error.message}`);
  process.exit(1);
}

let synced = 0;
let skipped = 0;
let failed = 0;

for (const p of patients ?? []) {
  const email = (p.contact_email ?? '').trim();
  if (!email) {
    skipped++;
    continue;
  }

  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(p.id);
  if (getErr || !userData?.user) {
    console.error(`FAILED ${p.id}: could not look up auth user (${getErr?.message ?? 'no user'})`);
    failed++;
    continue;
  }

  // Already swapped — leave it alone (idempotent re-runs).
  if (userData.user.email && !userData.user.email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
    skipped++;
    continue;
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(p.id, {
    email,
    email_confirm: true,
  });

  if (updErr) {
    console.error(`FAILED ${p.id}: ${updErr.message}`);
    failed++;
  } else {
    console.log(`synced ${p.id} -> ${email}`);
    synced++;
  }
}

console.log(`Done. synced=${synced} skipped=${skipped} failed=${failed}`);
