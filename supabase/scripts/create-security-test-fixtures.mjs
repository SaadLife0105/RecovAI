// One-time fixture setup — a clearly-labeled, separate doctor/patient pair for
// RLS / cross-role security testing (Phase 7.3-C). Run by hand, once.
//
// This creates a SECOND doctor and a SECOND patient (assigned to that new
// doctor, NOT to Sa'ad's existing test doctor) plus a little seed data, so the
// follow-up test suite has a genuinely independent account boundary to probe.
// The single most important seed row is the patient's journal_entries row: the
// security property most worth verifying is "a doctor can never read a
// patient's journal", and that test needs a real row that must FAIL to leak.
//
// Everything it creates is unmistakably synthetic and grep-able later:
//   - emails on the @recovai-test-fixture.internal domain
//   - full_names literally prefixed 'TEST FIXTURE — …'
// so a fixture can never be mistaken for a real doctor/patient at a glance.
//
// It uses the service role (admin) client, exactly like the create-patient
// Edge Function: createUser(...) then a direct profiles/patient_substances
// insert (RLS is bypassed by the service role — deliberate, this is setup, not
// the app's normal submission path). The doctor is created the same way a real
// doctor self-signup is: createUser with full_name in user_metadata, letting
// the handle_new_doctor_signup trigger insert the doctor's profiles row.
//
// NOT idempotent. Running it twice would create duplicate fixtures, so there's
// a guard: if a profile named 'TEST FIXTURE — Doctor Two (RLS)' already exists,
// it prints that and exits cleanly without creating anything.
//
// HOW TO RUN (service-role key required — never commit it):
//   1. Grab the service_role key from the Supabase dashboard:
//        Project Settings → API → Project API keys → service_role (reveal).
//   2. From the repo root, with the key set ONLY for this one command:
//        SUPABASE_URL="https://<project-ref>.supabase.co" \
//        SUPABASE_SERVICE_ROLE_KEY="<service_role_key>" \
//        node supabase/scripts/create-security-test-fixtures.mjs
//      (On Windows PowerShell:
//        $env:SUPABASE_URL="https://<project-ref>.supabase.co";
//        $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>";
//        node supabase/scripts/create-security-test-fixtures.mjs )
//   3. Copy the printed credentials block into your test-suite .env / notes.
//
// SUPABASE_URL is the same value as EXPO_PUBLIC_SUPABASE_URL in your .env.

import { createClient } from '@supabase/supabase-js';

// --- Fixture constants (deliberately obvious, grep-able, non-secret) ---------
const DOCTOR_FULL_NAME = 'TEST FIXTURE — Doctor Two (RLS)';
const DOCTOR_EMAIL = 'test-doctor-2@recovai-test-fixture.internal';
const DOCTOR_PASSWORD = 'TestFixtureDoctor2!Rls';

const PATIENT_FULL_NAME = 'TEST FIXTURE — Patient Two (RLS)';
const PATIENT_USERNAME = 'test_patient_fixture_2';
const PATIENT_EMAIL = 'test-patient-2@recovai-test-fixture.internal';
const PATIENT_PASSWORD = 'TestFixturePatient2!Rls';
const PATIENT_DRUG_CLASS = 'cannabis'; // any reasonable class; marked primary

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
// a partial failure never leaves orphans that would fool the guard on re-run.
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
  .select('id, role, full_name')
  .eq('full_name', DOCTOR_FULL_NAME)
  .maybeSingle();

if (guardError) {
  console.error(`Could not check for existing fixture: ${guardError.message}`);
  process.exit(1);
}

if (existing) {
  console.log('Fixtures already exist — nothing to do.');
  console.log(`  Existing fixture doctor profile id: ${existing.id}`);
  console.log(`  Doctor login: ${DOCTOR_EMAIL} / ${DOCTOR_PASSWORD}`);
  console.log(`  Patient login (username): ${PATIENT_USERNAME} / ${PATIENT_PASSWORD}`);
  console.log('Delete these fixtures first if you want to recreate them.');
  process.exit(0);
}

// --- Step 1: create the second DOCTOR ---------------------------------------
// Same path as real doctor self-signup: no role='patient' metadata, so the
// handle_new_doctor_signup trigger fires and inserts the doctor's profiles row
// (role='doctor', archived=false, full_name from user_metadata).
const { data: doctorUser, error: doctorErr } = await admin.auth.admin.createUser({
  email: DOCTOR_EMAIL,
  password: DOCTOR_PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: DOCTOR_FULL_NAME },
});

if (doctorErr || !doctorUser?.user) {
  await fail(`could not create doctor auth user: ${doctorErr?.message ?? 'no user returned'}`);
}
const doctorId = doctorUser.user.id;
createdUserIds.push(doctorId);
console.log(`Created doctor auth user + profile (via trigger): ${doctorId}`);

// --- Step 2: create the second PATIENT, assigned to the NEW doctor ----------
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
console.log(`Created patient auth user + profile + substance: ${patientId}`);

// --- Step 3: seed data (inserted directly, RLS bypassed on purpose) ----------
const { error: checkinErr } = await admin.from('checkins').insert({
  patient_id: patientId,
  date: TODAY,
  mood: 6,
  sleep: 5,
  craving: 4,
  isolated: false,
  steps: 3200,
  risk_score: 42.5,
});
if (checkinErr) await fail(`could not insert checkin: ${checkinErr.message}`);

// The important one: a real journal row the doctor must NEVER be able to read.
const { error: journalErr } = await admin.from('journal_entries').insert({
  patient_id: patientId,
  date: TODAY,
  mood_level: 'okay',
  content: 'TEST FIXTURE ENTRY — do not treat as real patient data',
});
if (journalErr) await fail(`could not insert journal_entry: ${journalErr.message}`);

const { error: zoneErr } = await admin.from('risk_zones').insert({
  patient_id: patientId,
  doctor_id: doctorId,
  lat: -20.1609, // Port Louis, Mauritius — plausible placeholder
  lng: 57.5012,
  radius_m: 100,
  zone_type: 'other',
  classification: 'low_risk',
  label: 'TEST FIXTURE ZONE — do not treat as real',
});
if (zoneErr) await fail(`could not insert risk_zone: ${zoneErr.message}`);
console.log('Seeded checkin + journal_entry + risk_zone.');

// --- Done: print everything Sa'ad needs to note down -------------------------
console.log('\n============================================================');
console.log(' SECURITY TEST FIXTURES CREATED — copy this into your notes');
console.log('============================================================');
console.log(`FIXTURE_DOCTOR_ID=${doctorId}`);
console.log(`FIXTURE_DOCTOR_EMAIL=${DOCTOR_EMAIL}`);
console.log(`FIXTURE_DOCTOR_PASSWORD=${DOCTOR_PASSWORD}`);
console.log('');
console.log(`FIXTURE_PATIENT_ID=${patientId}`);
console.log(`FIXTURE_PATIENT_USERNAME=${PATIENT_USERNAME}`);
console.log(`FIXTURE_PATIENT_EMAIL=${PATIENT_EMAIL}`);
console.log(`FIXTURE_PATIENT_PASSWORD=${PATIENT_PASSWORD}`);
console.log('============================================================');
console.log('Note: patients sign in with their USERNAME, not email.');
console.log('Done.');
