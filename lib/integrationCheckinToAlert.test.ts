/**
 * @jest-environment node
 */
/// <reference types="node" />
// ^ Scoped to this file only (tsconfig deliberately keeps global types = jest,
//   no node globals app-wide). This live test needs node's http/https.

// ============================================================================
// END-TO-END INTEGRATION TEST — check-in → risk score → agent → alert.
// Phase 7.3-D2.
//
// !!! THIS MAKES A REAL, PAID ANTHROPIC API CALL through the live risk-agent
// Edge Function, and real writes to the live Supabase project. It is NOT a pure
// unit test. DO NOT run it in a loop or repeatedly during development — write
// it, run it ONCE to confirm it passes, done. Each run costs money and mutates
// live data (which afterAll cleans up, but only if a service-role key is
// present — see the cleanup note at the bottom).
//
// Same "live network, node environment" conventions as lib/securityRls.test.ts
// (its precedent): the @jest-environment node pragma and the same real-fetch
// shim (jest-expo's mocked fetch can't do real network — see that file).
//
// Pipeline under test (mirrors app/(patient)/check-in.tsx exactly):
//   1. Compute the risk score with the PRODUCTION computeRiskScore (not a
//      reimplementation), using riskEngine.test.ts's worst-case inputs — which
//      clamp to 100, the maximum, giving the agent the strongest signal to act.
//   2. Insert the checkin as the authenticated fixture PATIENT (their own
//      RLS-scoped client), same columns/shape check-in.tsx upserts.
//   3. Invoke risk-agent exactly as check-in.tsx does: functions.invoke(
//      'risk-agent', { body: {} }) on the patient client — but AWAITED here.
//
// Fixture: supabase/scripts/create-integration-test-fixture.mjs (already run) —
// a CLEAN patient (heroin_opioids primary, zero prior history) assigned to the
// existing fixture "Doctor Two". The empty history matters: it removes any
// restraint signal, so a maximal check-in has nothing to argue against.
// ============================================================================

import http from 'node:http';
import https from 'node:https';
import { URL as NodeURL } from 'node:url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { computeRiskScore, RiskInputs } from './riskEngine';
import { getMauritiusDateString } from './mauritiusTime';

// --- Real-fetch shim (copied from lib/securityRls.test.ts; see that file for
// the full rationale — jest-expo's fetch is a non-functional stub). ----------
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
        const nullBody = status === 204 || status === 205 || status === 304 || status === 101;
        resolve(new Response(nullBody ? null : body, { status, statusText: res.statusMessage ?? '', headers }));
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

// --- Fixture credentials (synthetic, labeled, non-sensitive) -----------------
const FIXTURE_PATIENT_USERNAME = 'test_patient_fixture_integration';
const FIXTURE_PATIENT_PASSWORD = 'TestFixtureIntegration!E2E';
// Doctor Two — used ONLY to read agent_runs, which has no patient RLS policy
// (doctor-read only). Same account as lib/securityRls.test.ts.
const FIXTURE_DOCTOR_EMAIL = 'test-doctor-2@recovai-test-fixture.internal';
const FIXTURE_DOCTOR_PASSWORD = 'TestFixtureDoctor2!Rls';

const SYNTHETIC_EMAIL_DOMAIN = '@patients.recovai.internal';

// Maximal-severity check-in. riskEngine.test.ts's worst case uses mood 0 /
// sleep 0, but those are NOT insertable: the checkins table constrains
// mood/sleep/craving to 1..10 (checkins_mood_check), and the engine itself
// documents the domain as 1-10 — the app's sliders never produce 0. So this
// uses the nearest VALID maximal check-in: mood 1, sleep 1, craving 10,
// isolated, steps 500, high_risk zone. For heroin_opioids (sensitivity 1.15)
// that still clamps to 100 (base 96.5 * 1.15 = 110.975 -> 100), and it
// genuinely exercises the class coefficient: cannabis on the same inputs would
// score 96.5, only the opioid multiplier reaches 100. The expectedScore===100
// assertion below is the guard that this reasoning still holds.
const WORST_CASE: RiskInputs = {
  craving: 10,
  mood: 1,
  sleep: 1,
  isolated: true,
  steps: 500,
  zoneDangerLevel: 'high_risk',
};

// Agent alone can take up to 15s by design; leave room for insert + reads +
// cleanup on top.
jest.setTimeout(60000);

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: nodeFetch },
  });
}

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
let checkinDate: string;
let expectedScore: number;

// Captured pipeline results, asserted in the it() blocks below.
let insertError: string | null = null;
let invokeError: string | null = null;
let agentResponse: { outcome?: string; agentRunId?: string | null; iterations?: number; fallbackRan?: boolean } | null =
  null;

beforeAll(async () => {
  // --- Sign in as the fixture PATIENT (username -> login email, like the app) ---
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

  // --- Sign in as the fixture DOCTOR (needed to read agent_runs) ---------------
  doctorClient = anonClient();
  const { data: dAuth, error: dErr } = await doctorClient.auth.signInWithPassword({
    email: FIXTURE_DOCTOR_EMAIL,
    password: FIXTURE_DOCTOR_PASSWORD,
  });
  if (dErr || !dAuth.user) {
    throw new Error(`Could not sign in fixture doctor: ${dErr?.message ?? 'no user'}`);
  }

  // --- Step 1: compute the score with the PRODUCTION function ------------------
  expectedScore = computeRiskScore(WORST_CASE, 'heroin_opioids');
  checkinDate = getMauritiusDateString();

  // --- Step 2: insert the check-in as the patient (same shape as check-in.tsx) -
  const { error: ciErr } = await patientClient.from('checkins').upsert(
    {
      patient_id: fixturePatientId,
      date: checkinDate,
      mood: WORST_CASE.mood,
      sleep: WORST_CASE.sleep,
      craving: WORST_CASE.craving,
      isolated: WORST_CASE.isolated,
      steps: WORST_CASE.steps,
      risk_score: expectedScore,
    },
    { onConflict: 'patient_id,date' }
  );
  insertError = ciErr?.message ?? null;

  // --- Step 3: invoke risk-agent exactly as check-in.tsx does (awaited here) ---
  if (!insertError) {
    const { data, error } = await patientClient.functions.invoke('risk-agent', { body: {} });
    invokeError = error?.message ?? null;
    agentResponse = (data as typeof agentResponse) ?? null;
  }

  // Surfaced in the run log — this is dissertation evidence, report it precisely.
  console.log('\n=== INTEGRATION PIPELINE RESULT ===');
  console.log('expected risk_score:', expectedScore);
  console.log('checkin insert error:', insertError);
  console.log('risk-agent invoke error:', invokeError);
  console.log('risk-agent response:', JSON.stringify(agentResponse));
  console.log('===================================\n');
});

afterAll(async () => {
  // Service-role, best-effort cleanup — leave the fixture genuinely clean so a
  // future re-run isn't influenced by this run's alert/flag/chat history (the
  // agent legitimately restrains itself once it can see prior alerts).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn(
      '\n[integration] SUPABASE_SERVICE_ROLE_KEY not set — CANNOT clean up. The ' +
        'fixture patient is left DIRTY: this run\'s checkin, any alerts, the ' +
        'agent_runs row, a possibly-set urgent-review flag, and any agent chat ' +
        'message all remain. The NEXT run will see this history and the agent may ' +
        'legitimately behave differently (e.g. restrain itself). Set the key and ' +
        're-run cleanup, or clean these rows by hand.\n'
    );
  } else if (fixturePatientId) {
    const admin = createClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: nodeFetch },
    });
    const log = (label: string, error: { message: string } | null) =>
      console.log(`cleanup ${label}: ${error ? `FAILED ${error.message}` : 'ok'}`);
    // chat_conversations cascades to chat_messages (FK on delete cascade).
    log('chat_conversations', (await admin.from('chat_conversations').delete().eq('patient_id', fixturePatientId)).error);
    log('alerts', (await admin.from('alerts').delete().eq('patient_id', fixturePatientId)).error);
    log('agent_runs', (await admin.from('agent_runs').delete().eq('patient_id', fixturePatientId)).error);
    log('checkins', (await admin.from('checkins').delete().eq('patient_id', fixturePatientId).eq('date', checkinDate)).error);
    log(
      'reset flag',
      (await admin.from('profiles').update({ flagged_for_urgent_review: false }).eq('id', fixturePatientId)).error
    );
  }
  await patientClient?.auth.signOut();
  await doctorClient?.auth.signOut();
});

// ============================================================================
// HARD assertions — mechanical guarantees. Any failure is a real finding.
// ============================================================================
describe('mechanical guarantees (hard)', () => {
  it('the worst-case inputs clamp to risk_score 100 (production computeRiskScore)', () => {
    expect(expectedScore).toBe(100);
  });

  it('the checkin row was inserted with exactly the expected values', async () => {
    expect(insertError).toBeNull();
    const { data, error } = await patientClient
      .from('checkins')
      .select('patient_id, date, mood, sleep, craving, isolated, steps, risk_score')
      .eq('patient_id', fixturePatientId)
      .eq('date', checkinDate)
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(Number(data!.risk_score)).toBe(expectedScore); // 100
    expect(data!.mood).toBe(WORST_CASE.mood);
    expect(data!.sleep).toBe(WORST_CASE.sleep);
    expect(data!.craving).toBe(WORST_CASE.craving);
    expect(data!.isolated).toBe(WORST_CASE.isolated);
    expect(data!.steps).toBe(WORST_CASE.steps);
  });

  it('risk-agent returned no error and a non-null agentRunId', () => {
    expect(invokeError).toBeNull();
    expect(agentResponse).not.toBeNull();
    expect(agentResponse!.agentRunId).toBeTruthy();
  });

  it('an agent_runs row exists matching this patient/date, with current_score 100 in its input_context', async () => {
    const runId = agentResponse?.agentRunId;
    expect(runId).toBeTruthy();
    // agent_runs has no patient RLS policy — read it as the assigned doctor.
    const { data, error } = await doctorClient
      .from('agent_runs')
      .select('patient_id, checkin_date, input_context, outcome')
      .eq('id', runId!)
      .single();
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.patient_id).toBe(fixturePatientId);
    expect(data!.checkin_date).toBe(checkinDate);
    expect((data!.input_context as { current_score?: number }).current_score).toBe(expectedScore); // 100
  });

  it('the agent did NOT decide to do nothing (outcome !== no_action)', () => {
    // For a max-severity check-in on the highest-urgency class with a clean
    // history, doing nothing would itself be a finding worth surfacing.
    expect(agentResponse?.outcome).not.toBe('no_action');
  });
});

// ============================================================================
// SOFT / ADVISORY — the agent's judgment. The specific action is a real LLM
// decision, so we log what it chose and only WARN (never fail) if it took a
// different-but-legitimate action instead of alerting.
// ============================================================================
describe('agent judgment (advisory — logged, not failed)', () => {
  it('reports what the agent actually did and whether an alert was created', async () => {
    const outcome = agentResponse?.outcome ?? '(none)';
    // Alerts: readable by the assigned doctor (doctor_id = Doctor Two).
    const { data: alerts, error } = await doctorClient
      .from('alerts')
      .select('type, urgency, created_at')
      .eq('patient_id', fixturePatientId)
      .order('created_at', { ascending: false });
    if (error) console.warn(`[advisory] could not read alerts: ${error.message}`);

    const alertRows = alerts ?? [];
    const hoped = alertRows.filter((a) => a.type === 'agent_alert' || a.type === 'high_risk_score');

    console.log('\n=== AGENT JUDGMENT (advisory) ===');
    console.log('outcome:', outcome);
    console.log('alerts created for patient:', JSON.stringify(alertRows));
    if (hoped.length > 0) {
      console.log(`PASS (hoped-for): an alert was created (type ${hoped.map((a) => a.type).join(', ')}).`);
    } else if (outcome !== 'no_action') {
      console.warn(
        `[advisory] No agent_alert/high_risk_score row, but the agent took a different real ` +
          `action (outcome="${outcome}"). That is a legitimate, defensible decision by design ` +
          `(e.g. send_patient_message / flag_for_urgent_review) — just not the specific alert ` +
          `this test hoped to observe. NOT failing on this.`
      );
    } else {
      console.warn('[advisory] No alert AND outcome is no_action — the hard assertion above covers this.');
    }
    console.log('=================================\n');

    // Advisory only — this test never fails on the judgment call itself.
    expect(true).toBe(true);
  });
});
