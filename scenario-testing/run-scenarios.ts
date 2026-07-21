// Phase 5.3 agent scenario harness (Development Plan.md §5.3).
//
// Standalone local script — NOT app code, NOT an Edge Function, never
// deployed. It drives the REAL deployed risk-agent against ten scripted
// check-in histories for ONE dedicated test patient. Only the history is
// synthetic: the score comes from lib/riskEngine.ts itself, and the agent
// call is a real authenticated fetch to the real function.
//
// Usage:
//   node --env-file=scenario-testing/.env.local node_modules/.bin/tsx scenario-testing/run-scenarios.ts
//   npx tsx scenario-testing/run-scenarios.ts --check        (no DB, no API — score arithmetic only)
//   npx tsx scenario-testing/run-scenarios.ts --only=a,b     (subset)
//   npx tsx scenario-testing/run-scenarios.ts --runs=1       (fewer than the default 3 repeats)
//
// SAFETY: every query, update and delete below is scoped by this one
// patient's UUID. Nothing here touches another patient's data.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { computeRiskScore } from '../lib/riskEngine';
import { getMauritiusDateString } from '../lib/mauritiusTime';
import type { DrugClass } from '../lib/types';
import { SCENARIOS, type Day, type Scenario } from './scenarios';

const HERE = dirname(fileURLToPath(import.meta.url));

const PATIENT_USERNAME = 'testpatient3';
const PATIENT_EMAIL = `${PATIENT_USERNAME}@patients.recovai.internal`; // 0001's synthetic-email convention
const PATIENT_PASSWORD = 'Password123';
const DEFAULT_DRUG_CLASS: DrugClass = 'cannabis';
const SYSTEM_CONVERSATION_TITLE = 'RecovAI Check-ins'; // must match risk-agent/index.ts
const ZONE_LABEL_PREFIX = 'Scenario harness zone'; // only zones with this prefix are ever deleted
const DEFAULT_RUNS_PER_SCENARIO = 3;

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const onlyArg = args.find((a: string) => a.startsWith('--only='))?.slice('--only='.length);
const runsArg = args.find((a: string) => a.startsWith('--runs='))?.slice('--runs='.length);
const runsPerScenario = runsArg ? Number(runsArg) : DEFAULT_RUNS_PER_SCENARIO;
const selected = onlyArg
  ? SCENARIOS.filter((s) => onlyArg.split(',').includes(s.id))
  : SCENARIOS;

/** Calendar date for day `i` of an `n`-day sequence, the last day being today. */
function dateForDay(i: number, n: number): string {
  return getMauritiusDateString(new Date(Date.now() - (n - 1 - i) * 86_400_000));
}

function scoreFor(day: Day, drugClass: DrugClass): number {
  return computeRiskScore(
    {
      craving: day.craving,
      mood: day.mood,
      sleep: day.sleep,
      isolated: day.isolated,
      steps: day.steps,
      zoneDangerLevel: day.zone,
    },
    drugClass
  );
}

// ---------------------------------------------------------------------------
// --check: pure arithmetic, no network, no credentials. Run this before
// spending API calls, to confirm the harness computes what §5.3 expects.
// ---------------------------------------------------------------------------
function runCheck(): void {
  console.log('Score check — computeRiskScore() vs the hand-calculated expectations\n');
  let mismatches = 0;
  for (const s of SCENARIOS) {
    const scores = s.days.map((d) => scoreFor(d, s.drugClass));
    const final = scores[scores.length - 1];
    const ok = Math.abs(final - s.expectedFinalScore) < 0.01;
    if (!ok) mismatches++;
    console.log(
      `(${s.id}) ${s.drugClass.padEnd(15)} days: [${scores.map((n) => n.toFixed(2)).join(', ')}]\n` +
        `     final computed ${final.toFixed(3)} | expected ${s.expectedFinalScore} | ${ok ? 'MATCH' : '*** MISMATCH ***'}\n`
    );
  }
  if (mismatches > 0) {
    console.error(`${mismatches} scenario(s) MISMATCHED. Stop and report this — do not run the sweep.`);
    process.exit(1);
  }
  console.log('All 10 scenarios match their hand-calculated expected final score.');
}

if (checkOnly) {
  runCheck();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Live run
// ---------------------------------------------------------------------------
const SUPABASE_URL = requireEnv('SUPABASE_URL');
const SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = requireEnv('SUPABASE_ANON_KEY');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Create scenario-testing/.env.local from .env.example and run with:\n` +
        `  node --env-file=scenario-testing/.env.local node_modules/.bin/tsx scenario-testing/run-scenarios.ts`
    );
  }
  return value;
}

interface RunResult {
  run: number;
  computedFinalScore: number;
  outcome: string;
  reasoningSummary: string | null;
  iterations: number;
  truncated: boolean;
  toolNames: string[];
  fallbackTriggered: boolean;
  /** Cross-checked against the real tables, not read off the audit row. */
  sideEffects: { newAlerts: number; flagged: boolean; agentMessages: number };
  /** Diagnostic only (2026-07-21 timeout_fallback investigation) — read
   * straight off risk-agent's own response body, not re-derived. */
  elapsedMs?: number;
  timings?: { label: string; ms: number }[];
  error?: string;
}

async function main(): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // --- Setup 1: resolve the test patient ---
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, role, archived, assigned_doctor_id')
    .eq('username', PATIENT_USERNAME)
    .single();

  if (profileError || !profile) {
    throw new Error(`Could not find patient '${PATIENT_USERNAME}': ${profileError?.message ?? 'no row'}`);
  }
  if (profile.role !== 'patient') throw new Error(`'${PATIENT_USERNAME}' is not a patient profile.`);
  if (profile.archived) throw new Error(`'${PATIENT_USERNAME}' is archived — restore it before running.`);
  if (!profile.assigned_doctor_id) throw new Error(`'${PATIENT_USERNAME}' has no assigned doctor; risk-agent returns 400.`);

  const patientId: string = profile.id;
  const doctorId: string = profile.assigned_doctor_id;
  console.log(`Patient: ${profile.full_name} (${patientId})\nDoctor:  ${doctorId}\n`);

  // --- Setup 2: sign in AS the patient (risk-agent needs a genuine patient JWT) ---
  const patientAuth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: signIn, error: signInError } = await patientAuth.auth.signInWithPassword({
    email: PATIENT_EMAIL,
    password: PATIENT_PASSWORD,
  });
  if (signInError || !signIn.session) {
    throw new Error(`Sign-in as ${PATIENT_EMAIL} failed: ${signInError?.message ?? 'no session'}`);
  }
  if (signIn.user.id !== patientId) {
    throw new Error(`Signed-in user ${signIn.user.id} != resolved profile ${patientId}. Refusing to continue.`);
  }
  const accessToken = signIn.session.access_token;

  // --- Setup 3: report the existing primary substance row before changing anything ---
  const { data: existingSubstances } = await admin
    .from('patient_substances')
    .select('drug_class, is_primary, recovery_start_date')
    .eq('patient_id', patientId);
  console.log(
    existingSubstances?.length
      ? `Existing patient_substances: ${JSON.stringify(existingSubstances)}`
      : 'No patient_substances row exists — the harness will create one per scenario.'
  );
  console.log('');

  // --- The sweep ---
  const results = new Map<string, RunResult[]>();
  for (const scenario of selected) {
    console.log(`\n=== Scenario (${scenario.id}) ${scenario.name} — ${runsPerScenario} run(s) ===`);
    const scenarioResults: RunResult[] = [];
    for (let run = 1; run <= runsPerScenario; run++) {
      process.stdout.write(`  run ${run}… `);
      try {
        const result = await runOnce(admin, scenario, run, patientId, doctorId, accessToken);
        scenarioResults.push(result);
        console.log(
          `${result.outcome} (${result.iterations} iter${result.truncated ? ', TRUNCATED' : ''}) ` +
            `tools=[${result.toolNames.join(', ')}] alerts=${result.sideEffects.newAlerts} ` +
            `flagged=${result.sideEffects.flagged} msgs=${result.sideEffects.agentMessages} ` +
            `elapsed=${result.elapsedMs ?? '?'}ms`
        );
        if (result.timings?.length) {
          console.log(`    timings: ${result.timings.map((t) => `${t.label}=${t.ms}ms`).join(', ')}`);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(`ERROR: ${message}`);
        scenarioResults.push({
          run,
          computedFinalScore: NaN,
          outcome: 'harness_error',
          reasoningSummary: null,
          iterations: 0,
          truncated: false,
          toolNames: [],
          fallbackTriggered: false,
          sideEffects: { newAlerts: 0, flagged: false, agentMessages: 0 },
          error: message,
        });
      }
    }
    results.set(scenario.id, scenarioResults);
  }

  // Leave the patient in a clean state rather than mid-scenario.
  await resetPatient(admin, patientId, DEFAULT_DRUG_CLASS);
  console.log('\nPatient reset to a clean state.');

  const path = writeResults(results);
  console.log(`\nResults written to ${path}`);
}

/** Wipe everything this harness owns for this patient, then restore the given drug class. */
async function resetPatient(admin: SupabaseClient, patientId: string, drugClass: DrugClass): Promise<void> {
  // zone_breaches before risk_zones (FK), though the cascade would handle it.
  await admin.from('checkins').delete().eq('patient_id', patientId);
  await admin.from('zone_breaches').delete().eq('patient_id', patientId);
  await admin.from('risk_zones').delete().eq('patient_id', patientId).like('label', `${ZONE_LABEL_PREFIX}%`);
  await admin.from('alerts').delete().eq('patient_id', patientId);
  // chat_messages cascade off the conversation (0009's FK), so this is enough.
  await admin
    .from('chat_conversations')
    .delete()
    .eq('patient_id', patientId)
    .eq('title', SYSTEM_CONVERSATION_TITLE);
  await admin.from('profiles').update({ flagged_for_urgent_review: false }).eq('id', patientId);

  // Delete-then-insert rather than upsert: unique(patient_id, drug_class) plus
  // the one-primary-per-patient partial index make an in-place class change
  // fiddlier than just replacing the row.
  await admin.from('patient_substances').delete().eq('patient_id', patientId);
  const { error } = await admin.from('patient_substances').insert({
    patient_id: patientId,
    drug_class: drugClass,
    is_primary: true,
    recovery_start_date: getMauritiusDateString(new Date(Date.now() - 90 * 86_400_000)),
  });
  if (error) throw new Error(`Failed to set patient_substances to ${drugClass}: ${error.message}`);
}

async function runOnce(
  admin: SupabaseClient,
  scenario: Scenario,
  run: number,
  patientId: string,
  doctorId: string,
  accessToken: string
): Promise<RunResult> {
  await resetPatient(admin, patientId, scenario.drugClass);

  const n = scenario.days.length;

  // --- Seed the check-in history (real formula, service-role insert) ---
  const rows = scenario.days.map((day, i) => ({
    patient_id: patientId,
    date: dateForDay(i, n),
    mood: day.mood,
    sleep: day.sleep,
    craving: day.craving,
    isolated: day.isolated,
    steps: day.steps,
    risk_score: scoreFor(day, scenario.drugClass),
  }));
  const { error: checkinError } = await admin.from('checkins').insert(rows);
  if (checkinError) throw new Error(`Seeding check-ins failed: ${checkinError.message}`);

  const computedFinalScore = rows[rows.length - 1].risk_score;
  if (Math.abs(computedFinalScore - scenario.expectedFinalScore) > 0.01) {
    throw new Error(
      `Score mismatch on scenario (${scenario.id}): computed ${computedFinalScore}, expected ${scenario.expectedFinalScore}. ` +
        `Stop and report this rather than continuing.`
    );
  }

  // --- Optional: a historical zone breach ---
  if (scenario.breach) {
    const { data: zone, error: zoneError } = await admin
      .from('risk_zones')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        lat: -20.1609,
        lng: 57.5012,
        radius_m: 100,
        zone_type: 'other',
        classification: scenario.breach.classification,
        label: scenario.breach.label,
      })
      .select('id')
      .single();
    if (zoneError || !zone) throw new Error(`Seeding risk_zone failed: ${zoneError?.message ?? 'no row'}`);

    const { error: breachError } = await admin.from('zone_breaches').insert({
      patient_id: patientId,
      zone_id: zone.id,
      detected_at: new Date(Date.now() - scenario.breach.daysAgo * 86_400_000).toISOString(),
    });
    if (breachError) throw new Error(`Seeding zone_breach failed: ${breachError.message}`);
  }

  // --- Optional: an "already alerted yesterday" alerts row ---
  if (scenario.seedAlertOnDay) {
    const { error: alertError } = await admin.from('alerts').insert({
      patient_id: patientId,
      doctor_id: doctorId,
      type: 'high_risk_score',
      urgency: 'high',
      xai_explanation:
        'Seeded by the Phase 5.3 scenario harness: craving spiked to 9 with poor sleep and self-reported isolation.',
      read: false,
      created_at: `${dateForDay(scenario.seedAlertOnDay - 1, n)}T12:00:00Z`,
    });
    if (alertError) throw new Error(`Seeding alert failed: ${alertError.message}`);
  }

  // Baseline to diff the agent's side effects against.
  const alertsBefore = await countAlerts(admin, patientId);

  // --- Call the REAL Edge Function with the patient's own JWT (same as check-in.tsx) ---
  const response = await fetch(`${SUPABASE_URL}/functions/v1/risk-agent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const responseBody = await response.text();
  if (!response.ok) {
    throw new Error(`risk-agent returned ${response.status}: ${responseBody}`);
  }
  let elapsedMs: number | undefined;
  let timings: { label: string; ms: number }[] | undefined;
  try {
    const parsed = JSON.parse(responseBody);
    elapsedMs = typeof parsed.elapsedMs === 'number' ? parsed.elapsedMs : undefined;
    timings = Array.isArray(parsed.timings) ? parsed.timings : undefined;
  } catch {
    // Diagnostic fields only — a parse failure here shouldn't break the run.
  }

  // --- Read the audit row this call just wrote ---
  const { data: agentRun, error: runError } = await admin
    .from('agent_runs')
    .select('id, outcome, reasoning_summary, tool_calls, iterations, truncated')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (runError || !agentRun) {
    throw new Error(`No agent_runs row found after the call: ${runError?.message ?? 'none'} (body: ${responseBody})`);
  }

  const toolCalls = (agentRun.tool_calls ?? []) as { name: string }[];

  // --- Cross-check the real side-effect tables. The audit row SHOULD agree
  // with these; the point of checking is to catch it when it doesn't. ---
  const alertsAfter = await countAlerts(admin, patientId);
  const { data: flagRow } = await admin
    .from('profiles')
    .select('flagged_for_urgent_review')
    .eq('id', patientId)
    .single();
  const { data: conversation } = await admin
    .from('chat_conversations')
    .select('id')
    .eq('patient_id', patientId)
    .eq('title', SYSTEM_CONVERSATION_TITLE)
    .maybeSingle();
  let agentMessages = 0;
  if (conversation) {
    const { count } = await admin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id);
    agentMessages = count ?? 0;
  }

  return {
    run,
    computedFinalScore,
    outcome: agentRun.outcome,
    reasoningSummary: agentRun.reasoning_summary,
    iterations: agentRun.iterations,
    truncated: agentRun.truncated,
    toolNames: toolCalls.map((t) => t.name),
    fallbackTriggered: toolCalls.some((t) => t.name.startsWith('fallback:')),
    sideEffects: {
      newAlerts: alertsAfter - alertsBefore,
      flagged: flagRow?.flagged_for_urgent_review === true,
      agentMessages,
    },
    elapsedMs,
    timings,
  };
}

async function countAlerts(admin: SupabaseClient, patientId: string): Promise<number> {
  const { count } = await admin
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('patient_id', patientId);
  return count ?? 0;
}

function writeResults(results: Map<string, RunResult[]>): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const dir = join(HERE, 'results');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `scenario-results-${stamp}.md`);

  const lines: string[] = [
    `# Agent scenario results — ${new Date().toISOString()}`,
    '',
    `Patient: \`${PATIENT_USERNAME}\`. ${runsPerScenario} run(s) per scenario, full reset between every run.`,
    'Scores are computed by `lib/riskEngine.ts` itself; the agent call is the real deployed `risk-agent`.',
    '',
  ];

  for (const scenario of selected) {
    const runs = results.get(scenario.id) ?? [];
    const computed = runs.find((r) => !Number.isNaN(r.computedFinalScore))?.computedFinalScore;
    const scoreOk = computed !== undefined && Math.abs(computed - scenario.expectedFinalScore) < 0.01;

    lines.push(
      `## (${scenario.id}) ${scenario.name}`,
      '',
      `- **Drug class:** \`${scenario.drugClass}\``,
      `- **Days seeded:** ${scenario.days.length}`,
      `- **Expected final-day score:** ${scenario.expectedFinalScore}`,
      `- **Computed final-day score:** ${computed ?? 'n/a'} ${scoreOk ? '✅ match' : '❌ MISMATCH — investigate'}`,
      `- **Expected agent behaviour (§5.3):** ${scenario.expectation}`,
      '',
      '| Run | Outcome | Iter | Truncated | Fallback | Elapsed | Tools called | New alerts | Flagged | Agent msgs | Reasoning summary |',
      '|---|---|---|---|---|---|---|---|---|---|---|',
    );

    for (const r of runs) {
      lines.push(
        `| ${r.run} | ${r.error ? `\`harness_error\`: ${r.error}` : `\`${r.outcome}\``} | ${r.iterations} | ` +
          `${r.truncated ? 'yes' : 'no'} | ${r.fallbackTriggered ? 'yes' : 'no'} | ${r.elapsedMs ?? '?'}ms | ` +
          `${r.toolNames.length ? r.toolNames.map((t) => `\`${t}\``).join(', ') : '—'} | ` +
          `${r.sideEffects.newAlerts} | ${r.sideEffects.flagged ? 'yes' : 'no'} | ${r.sideEffects.agentMessages} | ` +
          `${(r.reasoningSummary ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`
      );
    }
    // Per-step breakdown, diagnostic only (2026-07-21 timeout investigation) —
    // kept out of the table itself since it doesn't fit a column cleanly.
    for (const r of runs) {
      if (r.timings?.length) {
        lines.push(`- Run ${r.run} timings: ${r.timings.map((t) => `${t.label}=${t.ms}ms`).join(', ')}`);
      }
    }
    lines.push('', '**Judgement (fill in by hand — correct / incorrect / partially correct, and why):**', '', '', '---', '');
  }

  writeFileSync(path, lines.join('\n'), 'utf8');
  return path;
}

main().catch((e) => {
  console.error(`\nFATAL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
