// generate-weekly-reports — Phase 6 weekly report generator
// (Development Plan.md §6, in-app only — no email).
//
// Runs on a Supabase Cron job every Monday, NOT from the app. That makes its
// auth model the odd one out in this project: every other Edge Function
// verifies a logged-in caller's JWT, but there is no caller session here at
// all. Since the function URL is public, it is gated on a shared secret
// (x-cron-secret header vs the CRON_SECRET env var) — the minimum needed to
// stop anyone who finds the URL from re-triggering it repeatedly.
//
// It then uses the service-role client only (same adminClient pattern as
// create-patient), because it reads and writes across every patient, not just
// one caller's own rows.
//
// One patient's failure must not abort the rest of the caseload, so each
// patient is handled in its own try/catch and failures come back in the
// response summary — same best-effort resilience principle as
// create-patient's rollback path.
//
// Processed CONCURRENTLY (Promise.allSettled), not one at a time. Supabase
// Cron's HTTP/Edge-Function job type hard-caps at a 5-second timeout
// (confirmed in the dashboard's own job form, no higher value accepted) — a
// sequential loop doing 3 queries per patient would blow that budget well
// before the caseload reaches even Phase 7's ~5-patient demo dataset. Running
// every patient's work in parallel keeps total wall time close to one
// patient's worth regardless of caseload size, which is what actually fits
// inside the 5s ceiling.
//
// ---------------------------------------------------------------------------
// DEPLOYMENT — manual steps for Sa'ad to run (not automated here):
//
//   1. Deploy the function:
//        supabase functions deploy generate-weekly-reports
//
//   2. Generate and set the shared secret (any long random string):
//        supabase secrets set CRON_SECRET=<value>
//
//   3. Supabase Dashboard → Integrations → Cron → New Job:
//        - Type:     "Supabase Edge Function"
//        - Function: generate-weekly-reports
//        - Schedule: 0 5 * * 1
//                    (05:00 UTC Monday = 09:00 Mauritius; UTC+4, no DST)
//        - Headers:  add  x-cron-secret: <same value as step 2>
//        - Timeout:  5000ms (the dashboard's hard max for this job type —
//                    this is why patient processing below is concurrent,
//                    not a sequential loop)
// ---------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// --- Mauritius time (UTC+4, no DST) ------------------------------------------
// lib/mauritiusTime.ts can't be imported here (it lives outside
// supabase/functions and Deno wouldn't resolve it), so these mirror
// getMauritiusDateString / getMauritiusStartOfDayIso's +4h offset math
// exactly. Do not "simplify" them into local-timezone calls — the Edge
// Function runtime is UTC, the app may not be.

/** "YYYY-MM-DD" for the Mauritius calendar day the given instant falls in. */
function getMauritiusDateString(date: Date = new Date()): string {
  const mauritius = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  const year = mauritius.getUTCFullYear();
  const month = String(mauritius.getUTCMonth() + 1).padStart(2, '0');
  const day = String(mauritius.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Real UTC instant of midnight Mauritius time on a "YYYY-MM-DD" date — the
 *  correct bound for range queries against UTC-stamped timestamptz columns. */
function mauritiusMidnightUtcIso(dateString: string): string {
  return new Date(Date.parse(`${dateString}T00:00:00Z`) - 4 * 60 * 60 * 1000).toISOString();
}

/** Shift a "YYYY-MM-DD" date string by whole days (UTC-midnight arithmetic). */
function addDays(dateString: string, days: number): string {
  return new Date(Date.parse(`${dateString}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Mirrors constants/theme.ts riskBand() and lib/riskEngine.ts exactly. */
function riskBand(score: number): 'low' | 'medium' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // --- Step 1: shared-secret gate (no user session exists for a cron run) ---
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // --- Step 2: work out the reporting week in Mauritius time ---
  // The 7 days ending YESTERDAY, so a Monday-morning run reports the
  // just-finished Mon–Sun week rather than a week ending today (which would
  // include a few hours of the current, still-incomplete day).
  const weekEnd = addDays(getMauritiusDateString(), -1);
  const weekStart = addDays(weekEnd, -6);
  // Half-open [start, end) in real UTC instants, for the timestamptz columns.
  const rangeStartIso = mauritiusMidnightUtcIso(weekStart);
  const rangeEndIso = mauritiusMidnightUtcIso(addDays(weekEnd, 1));

  // --- Step 3: every active patient ---
  const { data: patients, error: patientsError } = await adminClient
    .from('profiles')
    .select('id, assigned_doctor_id')
    .eq('role', 'patient')
    .eq('archived', false);

  if (patientsError) {
    return jsonResponse({ error: `Failed to load patients: ${patientsError.message}` }, 500);
  }

  // One patient's worth of work — same logic as before, just pulled out of
  // the loop body so it can be handed to Promise.allSettled below instead of
  // awaited one at a time.
  type PatientOutcome = { kind: 'generated' | 'skipped' } | { kind: 'error'; patientId: string; error: string };

  async function processPatient(patient: { id: string; assigned_doctor_id: string | null }): Promise<PatientOutcome> {
    try {
      if (!patient.assigned_doctor_id) {
        // Nobody to report to. Same class of thing as generate-xai's
        // "no assigned doctor" bail-out, but here it's just a skip.
        return { kind: 'skipped' };
      }

      // These three reads are independent of each other — run them together
      // rather than sequentially, same reasoning as the outer concurrency.
      const [
        { data: checkins, error: checkinsError },
        { count: alertCount, error: alertsError },
        { count: breachCount, error: breachesError },
      ] = await Promise.all([
        adminClient
          .from('checkins')
          .select('risk_score')
          .eq('patient_id', patient.id)
          .gte('date', weekStart)
          .lte('date', weekEnd),
        adminClient
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .gte('created_at', rangeStartIso)
          .lt('created_at', rangeEndIso),
        adminClient
          .from('zone_breaches')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .gte('detected_at', rangeStartIso)
          .lt('detected_at', rangeEndIso),
      ]);
      if (checkinsError) throw new Error(checkinsError.message);
      if (alertsError) throw new Error(alertsError.message);
      if (breachesError) throw new Error(breachesError.message);

      // No check-ins that week means there is nothing meaningful to report —
      // an all-zero row would read as "0 risk", which is the opposite of the
      // truth (we simply don't know). Skip rather than insert a false record.
      if (!checkins || checkins.length === 0) {
        return { kind: 'skipped' };
      }

      const avgRiskScore =
        Math.round((checkins.reduce((sum, c) => sum + c.risk_score, 0) / checkins.length) * 100) / 100;
      const compliancePercent = Math.round((checkins.length / 7) * 100);

      // Idempotent: the unique (patient_id, week_start) constraint turns a
      // re-run for the same week into an update, never a duplicate.
      const { error: upsertError } = await adminClient.from('weekly_reports').upsert(
        {
          doctor_id: patient.assigned_doctor_id,
          patient_id: patient.id,
          week_start: weekStart,
          week_end: weekEnd,
          avg_risk_score: avgRiskScore,
          band: riskBand(avgRiskScore),
          compliance_percent: compliancePercent,
          alert_count: alertCount ?? 0,
          zone_breach_count: breachCount ?? 0,
        },
        { onConflict: 'patient_id,week_start' }
      );
      if (upsertError) throw new Error(upsertError.message);

      return { kind: 'generated' };
    } catch (err) {
      return { kind: 'error', patientId: patient.id, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Promise.allSettled, not Promise.all — one patient throwing (it shouldn't,
  // processPatient catches its own errors, but this is a second, structural
  // safety net) must never take down every other patient's already-resolved
  // result.
  const settled = await Promise.allSettled((patients ?? []).map(processPatient));

  let generated = 0;
  let skipped = 0;
  const errors: { patientId: string; error: string }[] = [];

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors.push({ patientId: patients?.[i]?.id ?? 'unknown', error: String(result.reason) });
      return;
    }
    const outcome = result.value;
    if (outcome.kind === 'generated') generated++;
    else if (outcome.kind === 'skipped') skipped++;
    else errors.push({ patientId: outcome.patientId, error: outcome.error });
  });

  return jsonResponse(
    {
      weekStart,
      weekEnd,
      patientsProcessed: patients?.length ?? 0,
      reportsGenerated: generated,
      skipped,
      errors,
    },
    200
  );
});
