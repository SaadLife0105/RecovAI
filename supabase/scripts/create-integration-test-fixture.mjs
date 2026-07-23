// One-time fixture setup — a CLEAN patient for the end-to-end integration test
// (check-in → risk score → agent → alert), Phase 7.3-D. Run by hand, once.
//
// Deliberately SEPARATE from create-security-test-fixtures.mjs. That script's
// fixture patient already has seeded check-in / journal / zone history, which
// would pollute the agent's reasoning. This patient starts with ZERO prior
// data of any kind — no checkins, no journal_entries, no risk_zones, no alerts
// — so the integration test's single self-submitted check-in is the only thing
// the agent ever sees for them.
//
// It reuses the EXISTING fixture doctor ("Doctor Two") from
// create-security-test-fixtures.mjs — that script must have been run first.
// No third doctor is created.
//
// Primary drug class is heroin_opioids on purpose: risk-agent/index.ts's system
// prompt explicitly treats opioid patients in early recovery as higher-urgency
// (faster relapse, overdose risk after abstinence), so a worst-case check-in is
// more likely to produce an alert — a more meaningful exercise of the
// substance-class-aware reasoning than a cannabis patient would give.
//
// Same conventions as the security-fixtures script: service-role (admin)
// client, unmistakably-synthetic + grep-able identifiers
// (@recovai-test-fixture.internal email, 'TEST FIXTURE — …' full_name), an
// idempotency guard on full_name, and a printed FIXTURE_*= credentials block.
// NOT idempotent beyond that guard.
//
// HOW TO RUN (service-role key required — never commit it):
//   1. Grab the service_role key from the Supabase dashboard:
//        Project Settings → API → Project API keys → service_role (reveal).
//   2. From the repo root, with the key set ONLY for this one command:
//        SUPABASE_URL="https://<project-ref>.supabase.co" \
//        SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
//        node supabase/scripts/create-integration-test-fixture.mjs
//      (On Windows PowerShell:
//        $env:SUPABASE_URL="https://<project-ref>.supabase.co";
//        $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>";
//        node supabase/scripts/create-integration-test-fixture.mjs )
//   3. Copy the printed credentials block into your test-suite .env / notes.
//
// SUPABASE_URL is the same value as EXPO_PUBLIC_SUPABASE_URL in your .env.

import { createClient } from '@supabase/supabase-js';

// --- Fixture constants (deliberately obvious, grep-able, non-secret) ---------
const DOCTOR_FULL_NAME = 'TEST FIXTURE — Doctor Two (RLS)'; // reused, not created

const PATIENT_FULL_NAME = 'TEST FIXTURE — Patient Integration (E2E)';
const PATIENT_USERNAME = 'test_patient_fixture_integration';
const PATIENT_EMAIL = 'test-patient-integration@recovai-test-fixture.internal';
const PATIENT_PASSWORD = 'TestFixtureIntegration!E2E';
const PATIENT_DRUG_CLASS = 'heroin_opioids'; // primary; see header note

// Mauritius (UTC+4) "today" — matches the app's daily-logic timezone convention.
const TODAY = new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 10);

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running (see header).'
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey);

// Auth users created this run — best-effort torn down if a later step fails, so
// a partial failure never leaves an orphan that would fool the guard on re-run.
const createdUserIds = [];

async function fail(message) {
  console.error(`\nFAILED: ${message}`);
  if (createdUserIds.length > 0) {
    console.error('Rolling back auth users created in this run...');
    for (const id of createdUserIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      console.error(error ? `  could not delete ${id}: ${error.message}` : `  deleted ${id}`);
    }
  }
  process.exit(1);
}

// --- Guard: don't duplicate an already-set-up fixture ------------------------
const { data: existing, error: guardError } = await admin
  .from('profiles')
  .select('id')
  .eq('full_name', PATIENT_FULL_NAME)
  .maybeSingle();

if (guardError) {
  console.error(`Could not check for existing fixture: ${guardError.message}`);
  process.exit(1);
}

if (existing) {
  console.log('Integration fixture already exists — nothing to do.');
  console.log(`  Existing fixture patient profile id: ${existing.id}`);
  console.log(`  Patient login (username): ${PATIENT_USERNAME} / ${PATIENT_PASSWORD}`);
  console.log('Delete this fixture first if you want to recreate it clean.');
  process.exit(0);
}

// --- Look up the EXISTING fixture doctor (Doctor Two) ------------------------
const { data: doctor, error: doctorLookupError } = await admin
  .from('profiles')
  .select('id')
  .eq('full_name', DOCTOR_FULL_NAME)
  .eq('role', 'doctor')
  .maybeSingle();

if (doctorLookupError) {
  console.error(`Could not look up the fixture doctor: ${doctorLookupError.message}`);
  process.exit(1);
}
if (!doctor) {
  console.error(
    `Fixture doctor '${DOCTOR_FULL_NAME}' not found. Run ` +
      `supabase/scripts/create-security-test-fixtures.mjs first — this script reuses that doctor.`
  );
  process.exit(1);
}
const doctorId = doctor.id;
console.log(`Reusing existing fixture doctor: ${doctorId}`);

// --- Create the CLEAN patient, assigned to that doctor ----------------------
// Mirrors create-patient/index.ts: createUser with role='patient' metadata so
// the doctor-signup trigger skips it, then insert the profiles row ourselves.
const { data: patientUser, error: patientErr } = await admin.auth.admin.createUser({
  email: PATIENT_EMAIL,
  password: PATIENT_PASSWORD,
  email_confirm: true,
  user_metadata: { role: 'patient' },
});

if (patientErr || !patientUser?.user) {
  await fail(`could not create patient auth user: ${patientErr?.message ?? 'no user returned'}`);
}
const patientId = patientUser.user.id;
createdUserIds.push(patientId);

const { error: patientProfileErr } = await admin.from('profiles').insert({
  id: patientId,
  role: 'patient',
  full_name: PATIENT_FULL_NAME,
  username: PATIENT_USERNAME,
  contact_email: PATIENT_EMAIL, // mirror login email onto contact_email, like create-patient
  assigned_doctor_id: doctorId,
  sobriety_start_date: TODAY,
});
if (patientProfileErr) await fail(`could not insert patient profile: ${patientProfileErr.message}`);

const { error: substanceErr } = await admin.from('patient_substances').insert({
  patient_id: patientId,
  drug_class: PATIENT_DRUG_CLASS,
  is_primary: true,
  recovery_start_date: TODAY,
});
if (substanceErr) await fail(`could not insert patient_substances: ${substanceErr.message}`);

// NO seed data — no checkins, journal_entries, risk_zones, or alerts. The
// integration test creates its own check-in against a genuinely empty history.
console.log(`Created CLEAN patient (no seed data): ${patientId}`);

// --- Done: print everything Sa'ad needs to note down -------------------------
console.log('\n============================================================');
console.log(' INTEGRATION TEST FIXTURE CREATED — copy this into your notes');
console.log('============================================================');
console.log(`FIXTURE_INTEGRATION_DOCTOR_ID=${doctorId}`);
console.log(`FIXTURE_INTEGRATION_PATIENT_ID=${patientId}`);
console.log(`FIXTURE_INTEGRATION_PATIENT_USERNAME=${PATIENT_USERNAME}`);
console.log(`FIXTURE_INTEGRATION_PATIENT_EMAIL=${PATIENT_EMAIL}`);
console.log(`FIXTURE_INTEGRATION_PATIENT_PASSWORD=${PATIENT_PASSWORD}`);
console.log(`FIXTURE_INTEGRATION_PATIENT_DRUG_CLASS=${PATIENT_DRUG_CLASS}`);
console.log('============================================================');
console.log('Note: patients sign in with their USERNAME, not email.');
console.log('This patient has ZERO prior checkins/journal/zones/alerts.');
console.log('Done.');
