/**
 * @jest-environment node
 */
/// <reference types="node" />
// ^ Scoped to this file only (tsconfig deliberately keeps global types = jest,
//   no node globals app-wide). This live-network test needs node's http/https.
// The default jest-expo preset runs tests in a React-Native environment whose
// mocked fetch/Response breaks @supabase/supabase-js's response parsing (throws
// `"undefined" is not valid JSON` on a perfectly good auth response). This
// suite makes real HTTP calls, so it runs in Jest's plain `node` environment
// (real global fetch) via the pragma above. Verified: identical calls succeed
// unchanged in plain Node.

// ============================================================================
// RLS / cross-role SECURITY test suite — Phase 7.3-C2.
//
// !!! THIS FILE IS NOT A PURE-FUNCTION UNIT TEST like the other 5 test files
// (riskEngine, forecast, geo, mauritiusTime, streakLogic). It makes REAL
// NETWORK CALLS to the live Supabase project, signing in as the synthetic
// fixture accounts created by
// supabase/scripts/create-security-test-fixtures.mjs (which must have been run
// already). It exercises what a genuine authenticated *anon-key* session can
// and cannot read/write — i.e. it tests the RLS policies themselves, not any
// local code. It needs network access and will fail if offline or if the
// fixtures don't exist.
//
// It uses ONLY anon-key clients for the actual boundary tests (exactly like the
// real app), never the service role. The service role is used for one thing
// only: an optional pre-flight sanity check that the two pre-existing target
// IDs really exist (see beforeAll) — and only if SUPABASE_SERVICE_ROLE_KEY is
// present in the environment. Provide it to get that strict check:
//   PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="<key>"; npx jest lib/securityRls.test.ts
// Without it, that one check is skipped (with a warning) and the anon boundary
// tests still run.
//
// Credentials below are hardcoded on purpose: they are the labeled, synthetic,
// non-sensitive fixture accounts, same reasoning as the fixture script that
// prints them to a terminal. The Supabase URL + anon key are the public,
// RLS-governed client values already committed to .env.
// ============================================================================

import http from 'node:http';
import https from 'node:https';
import { URL as NodeURL } from 'node:url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// jest-expo replaces global fetch with a non-functional stub (returns a
// Response whose status/body are undefined) — no real network. The `node`
// environment (pragma above) keeps the real Response constructor and node's
// http/https, so we hand supabase-js a minimal real fetch built on them. This
// exists ONLY to make live calls work under Jest; the app uses the platform's
// real fetch. If this shim were wrong, all 11 tests below fail — so the suite
// itself is its check.
// supabase-js passes headers as a Headers INSTANCE for PostgREST/RPC calls,
// which node's request() silently ignores (dropping the apikey -> 401). Flatten
// any Headers/array/object into the plain record node needs.
function toHeaderRecord(h: any): Record<string, string> {
  if (!h) return {};
  if (typeof h.forEach === 'function' && !Array.isArray(h)) {
    const out: Record<string, string> = {};
    h.forEach((v: string, k: string) => (out[k] = v));
    return out;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return h;
}

const nodeFetch = ((input: any, init: any = {}): Promise<Response> =>
  new Promise((resolve, reject) => {
    const u = new NodeURL(typeof input === 'string' ? input : input.url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request(u, { method: init.method || 'GET', headers: toHeaderRecord(init.headers) }, (res) => {
      res.setEncoding('utf8');
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          if (v != null) headers[k] = Array.isArray(v) ? v.join(', ') : v;
        }
        const status = res.statusCode ?? 0;
        // The Response constructor forbids a body on null-body statuses.
        const nullBody = status === 204 || status === 205 || status === 304 || status === 101;
        resolve(new Response(nullBody ? null : body, {
          status,
          statusText: res.statusMessage ?? '',
          headers,
        }));
      });
    });
    req.on('error', reject);
    if (init.signal) init.signal.addEventListener?.('abort', () => req.destroy(new Error('aborted')));
    if (init.body) req.write(init.body);
    req.end();
  })) as unknown as typeof fetch;

// --- Public client values (same as .env — anon key is public by design) ------
const SUPABASE_URL = 'https://sezoeupfbpfdywhiouhg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlem9ldXBmYnBmZHl3aGlvdWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDgyNzMsImV4cCI6MjA5OTYyNDI3M30.9NBs8T7Tj84hWnATpweP_7QKaGc7Ui9HkXzwqb4C2WE';

// --- Fixture accounts (synthetic, labeled, non-sensitive) --------------------
const FIXTURE_DOCTOR_EMAIL = 'test-doctor-2@recovai-test-fixture.internal';
const FIXTURE_DOCTOR_PASSWORD = 'TestFixtureDoctor2!Rls';
const FIXTURE_PATIENT_USERNAME = 'test_patient_fixture_2';
const FIXTURE_PATIENT_PASSWORD = 'TestFixturePatient2!Rls';

// --- Pre-existing project test accounts, referenced by ID only ---------------
const EXISTING_TEST_PATIENT_ID = '4b95c8f4-389e-4c56-a022-e890194be72d';
const EXISTING_TEST_DOCTOR_ID = '884b5068-c60a-4156-bb71-fbf0ad54e91c';

// --- Values seeded by the fixture script (assert positive controls match) ----
const SEEDED_RISK_SCORE = 42.5;
const SEEDED_JOURNAL_CONTENT = 'TEST FIXTURE ENTRY — do not treat as real patient data';

// Patient synthetic login fallback — same convention as login.tsx.
const SYNTHETIC_EMAIL_DOMAIN = '@patients.recovai.internal';

// Real network round-trips — the default 5s is too tight.
jest.setTimeout(30000);

// A fresh, session-less anon client. Not the app singleton (that persists to
// AsyncStorage and holds a single session) — we need two independent sessions.
function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: nodeFetch },
  });
}

// Replicates login.tsx's lookupPatientLoginEmail exactly.
async function lookupPatientLoginEmail(client: SupabaseClient, username: string): Promise<string | null> {
  try {
    const { data, error } = await client.rpc('get_patient_login_email', {
      p_username: username.trim().toLowerCase(),
    });
    if (error) return null;
    return typeof data === 'string' ? data : null;
  } catch {
    return null;
  }
}

let patientClient: SupabaseClient;
let doctorClient: SupabaseClient;
let fixturePatientId: string;
let fixtureDoctorId: string;

beforeAll(async () => {
  // --- Optional strict pre-flight: confirm the two target IDs really exist ---
  // Requires the service role (RLS would hide them from any anon session). Only
  // runs if the key is provided; otherwise skipped with a loud warning, since
  // the negative tests below return "empty" whether or not the target exists,
  // so a missing target would silently look like a passing security boundary.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: nodeFetch },
    });
    for (const id of [EXISTING_TEST_PATIENT_ID, EXISTING_TEST_DOCTOR_ID]) {
      const { data, error } = await admin.from('profiles').select('id').eq('id', id).maybeSingle();
      if (error) throw new Error(`Pre-flight admin lookup failed for ${id}: ${error.message}`);
      if (!data) {
        throw new Error(
          `Pre-flight FAILED: profiles row ${id} does not exist. Aborting — the ` +
            `negative tests would pass vacuously against a non-existent target.`
        );
      }
    }
  } else {
    console.warn(
      '\n[securityRls] SUPABASE_SERVICE_ROLE_KEY not set — skipping the strict ' +
        'existence pre-check of EXISTING_TEST_PATIENT_ID / EXISTING_TEST_DOCTOR_ID. ' +
        'Set it to have the suite verify those targets really exist.\n'
    );
  }

  // --- Sign in as the fixture PATIENT (username -> login email, like the app) --
  patientClient = anonClient();
  const patientLoginEmail =
    (await lookupPatientLoginEmail(patientClient, FIXTURE_PATIENT_USERNAME)) ??
    `${FIXTURE_PATIENT_USERNAME}${SYNTHETIC_EMAIL_DOMAIN}`;
  const { data: pAuth, error: pErr } = await patientClient.auth.signInWithPassword({
    email: patientLoginEmail,
    password: FIXTURE_PATIENT_PASSWORD,
  });
  if (pErr || !pAuth.user) {
    throw new Error(`Could not sign in fixture patient (${patientLoginEmail}): ${pErr?.message ?? 'no user'}`);
  }
  fixturePatientId = pAuth.user.id;

  // --- Sign in as the fixture DOCTOR (email/password) --------------------------
  doctorClient = anonClient();
  const { data: dAuth, error: dErr } = await doctorClient.auth.signInWithPassword({
    email: FIXTURE_DOCTOR_EMAIL,
    password: FIXTURE_DOCTOR_PASSWORD,
  });
  if (dErr || !dAuth.user) {
    throw new Error(`Could not sign in fixture doctor: ${dErr?.message ?? 'no user'}`);
  }
  fixtureDoctorId = dAuth.user.id;
});

afterAll(async () => {
  await patientClient?.auth.signOut();
  await doctorClient?.auth.signOut();
});

// ============================================================================
// POSITIVE CONTROLS — the query mechanism works; boundaries aren't just "empty
// because the whole thing is broken".
// ============================================================================
describe('positive controls', () => {
  it('1. patient reads their OWN checkins (non-empty, matches seeded values)', async () => {
    const { data, error } = await patientClient
      .from('checkins')
      .select('patient_id, risk_score, mood, sleep, craving')
      .eq('patient_id', fixturePatientId);
    expect(error).toBeNull();
    expect(data && data.length).toBeGreaterThan(0);
    const seeded = data!.find((r) => Number(r.risk_score) === SEEDED_RISK_SCORE);
    expect(seeded).toBeDefined();
    expect(seeded!.patient_id).toBe(fixturePatientId);
    expect(seeded!.mood).toBe(6);
    expect(seeded!.sleep).toBe(5);
    expect(seeded!.craving).toBe(4);
  });

  it('2. patient reads their OWN journal_entries (non-empty, matches seeded content)', async () => {
    const { data, error } = await patientClient
      .from('journal_entries')
      .select('patient_id, content')
      .eq('patient_id', fixturePatientId);
    expect(error).toBeNull();
    expect(data && data.length).toBeGreaterThan(0);
    expect(data!.some((r) => r.content === SEEDED_JOURNAL_CONTENT)).toBe(true);
  });

  it('3. doctor reads their OWN patient\'s checkins and risk_zones (non-empty)', async () => {
    const checkins = await doctorClient
      .from('checkins')
      .select('patient_id')
      .eq('patient_id', fixturePatientId);
    expect(checkins.error).toBeNull();
    expect(checkins.data && checkins.data.length).toBeGreaterThan(0);

    const zones = await doctorClient
      .from('risk_zones')
      .select('patient_id, doctor_id')
      .eq('patient_id', fixturePatientId);
    expect(zones.error).toBeNull();
    expect(zones.data && zones.data.length).toBeGreaterThan(0);
    expect(zones.data![0].doctor_id).toBe(fixtureDoctorId);
  });

  it('4. doctor reads their OWN patient\'s profile row (non-empty)', async () => {
    const { data, error } = await doctorClient
      .from('profiles')
      .select('id, assigned_doctor_id, full_name')
      .eq('id', fixturePatientId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.assigned_doctor_id).toBe(fixtureDoctorId);
  });
});

// ============================================================================
// NEGATIVE — patient-vs-patient isolation.
// ============================================================================
describe('patient cannot read another patient\'s data', () => {
  it('5. checkins for a different patient -> empty, no error', async () => {
    const { data, error } = await patientClient
      .from('checkins')
      .select('id')
      .eq('patient_id', EXISTING_TEST_PATIENT_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('6. journal_entries for a different patient -> empty, no error', async () => {
    const { data, error } = await patientClient
      .from('journal_entries')
      .select('id')
      .eq('patient_id', EXISTING_TEST_PATIENT_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('7. risk_zones for a different patient -> empty, no error', async () => {
    const { data, error } = await patientClient
      .from('risk_zones')
      .select('id')
      .eq('patient_id', EXISTING_TEST_PATIENT_ID);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('8. INSERT checkin targeting another patient -> rejected by RLS', async () => {
    const { data, error } = await patientClient
      .from('checkins')
      .insert({
        patient_id: EXISTING_TEST_PATIENT_ID,
        date: '2020-01-01', // arbitrary; the row must never be created anyway
        mood: 5,
        sleep: 5,
        craving: 5,
        risk_score: 50,
      })
      .select();
    // WITH CHECK (patient_id = auth.uid()) violation -> PostgREST returns an
    // error (code 42501), not a silent zero-row insert. Assert it's rejected.
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});

// ============================================================================
// NEGATIVE — the journal is invisible even to the patient's OWN doctor.
// This is the single most important guarantee in the suite (NFR5).
// ============================================================================
describe('journal is invisible to the assigned doctor', () => {
  it('9. doctor reads journal_entries for their OWN assigned patient -> empty', async () => {
    const { data, error } = await doctorClient
      .from('journal_entries')
      .select('id, content')
      .eq('patient_id', fixturePatientId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

// ============================================================================
// NEGATIVE — doctor-vs-doctor isolation.
// ============================================================================
describe('doctor cannot read another doctor\'s patient', () => {
  it('10. profile of a different doctor\'s patient -> empty/null', async () => {
    const { data, error } = await doctorClient
      .from('profiles')
      .select('id')
      .eq('id', EXISTING_TEST_PATIENT_ID)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('11. checkins and risk_zones of a different doctor\'s patient -> empty', async () => {
    const checkins = await doctorClient
      .from('checkins')
      .select('id')
      .eq('patient_id', EXISTING_TEST_PATIENT_ID);
    expect(checkins.error).toBeNull();
    expect(checkins.data).toEqual([]);

    const zones = await doctorClient
      .from('risk_zones')
      .select('id')
      .eq('patient_id', EXISTING_TEST_PATIENT_ID);
    expect(zones.error).toBeNull();
    expect(zones.data).toEqual([]);
  });
});
