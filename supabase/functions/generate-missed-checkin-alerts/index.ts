// generate-missed-checkin-alerts — Phase 6 missed-check-in detection
// (Development Plan.md §6).
//
// Runs on a Supabase Cron job every evening, NOT from the app — so, like
// generate-weekly-reports, there is no caller session at all. It reuses that
// function's auth model exactly: the same shared secret (x-cron-secret header
// vs the SAME CRON_SECRET env var — one secret for all cron functions, not one
// per function) and the service-role client only, because it reads and writes
// across every patient rather than one caller's own rows.
//
// Unlike generate-weekly-reports, which reports a FINISHED week, this checks
// the Mauritius day currently in progress: at 21:00 local there is still time
// to act on the nudge, which is the whole point of sending it.
//
// Idempotency is explicit here — there is no unique constraint to lean on the
// way weekly_reports has one — so before doing anything for a patient we look
// for an existing missed_checkin alert stamped inside today's Mauritius day.
// A cron retry or a manual re-trigger therefore never double-alerts the doctor
// or double-pushes the patient.
//
// One patient's failure must not abort the rest of the caseload, so each
// patient is handled in its own try/catch and failures come back in the
// response summary.
//
// Processed CONCURRENTLY (Promise.allSettled), not one at a time — Supabase
// Cron's Edge-Function job type hard-caps at a 5-second timeout, and a
// sequential loop doing 2–3 queries plus a push per patient would blow that
// budget long before the caseload matters. Written concurrent from version
// one, because generate-weekly-reports had to be rewritten into this shape.
//
// ---------------------------------------------------------------------------
// DEPLOYMENT — manual steps for Sa'ad to run (not automated here):
//
//   1. Deploy the function:
//        supabase functions deploy generate-missed-checkin-alerts
//
//   2. No new secret needed — this reuses the existing CRON_SECRET already set
//      for generate-weekly-reports.
//
//   3. Supabase Dashboard → Integrations → Cron → New Job:
//        - Type:     "Supabase Edge Function"
//        - Function: generate-missed-checkin-alerts
//        - Schedule: 0 17 * * *
//                    (17:00 UTC daily = 21:00 Mauritius; UTC+4, no DST)
//        - Headers:  add  x-cron-secret: <same value already set as CRON_SECRET>
//        - Timeout:  5000ms (the dashboard's hard max for this job type —
//                    this is why patient processing below is concurrent,
//                    not a sequential loop)
// ---------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendDoctorAlert } from '../_shared/doctorAlert.ts';

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
// exactly — same copies as generate-weekly-reports. Do not "simplify" them
// into local-timezone calls: the Edge Function runtime is UTC, the app may not
// be.

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

/** Gentle nudge to the patient's own device(s). Best-effort and independent of
 *  the doctor-side push inside sendDoctorAlert: a failure here is logged and
 *  swallowed, never surfaced as an error for the patient (NFR8).
 *
 *  Copy is warm and non-judgemental (Critical Caution #23) and carries no
 *  patient-specific detail (data minimisation, Critical Caution #10) —
 *  push notifications surface on a locked screen. */
async function sendPatientReminder(
  serviceRoleClient: ReturnType<typeof createClient>,
  patientId: string
): Promise<boolean> {
  try {
    const { data: tokens, error: tokensError } = await serviceRoleClient
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', patientId);

    if (tokensError) {
      console.warn(`Reminder push token lookup failed for patient ${patientId}: ${tokensError.message}`);
      return false;
    }

    const messages = (tokens ?? []).map((t: { expo_push_token: string }) => ({
      to: t.expo_push_token,
      title: 'RecovAI',
      body: "Don't forget to check in today — we're here for you whenever you're ready.",
    }));

    if (messages.length === 0) {
      console.warn(`Reminder push: no push_tokens rows for patient ${patientId} — nothing to send.`);
      return false;
    }

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const pushResText = await pushRes.text();
    console.log(`Reminder push: Expo API responded ${pushRes.status}: ${pushResText}`);
    if (!pushRes.ok) {
      console.warn(`Expo reminder push failed (${pushRes.status}): ${pushResText}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`Reminder push step failed: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
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

  // --- Step 2: TODAY in Mauritius time (the day still in progress) ---
  const today = getMauritiusDateString();
  // Half-open [today 00:00, tomorrow 00:00) in real UTC instants, for the
  // timestamptz created_at column on alerts.
  const dayStartIso = mauritiusMidnightUtcIso(today);
  const dayEndIso = mauritiusMidnightUtcIso(addDays(today, 1));

  // --- Step 3: every active patient ---
  const { data: patients, error: patientsError } = await adminClient
    .from('profiles')
    .select('id, assigned_doctor_id')
    .eq('role', 'patient')
    .eq('archived', false);

  if (patientsError) {
    return jsonResponse({ error: `Failed to load patients: ${patientsError.message}` }, 500);
  }

  type PatientOutcome =
    | { kind: 'alerted'; patientReminderSent: boolean }
    | { kind: 'skipped'; reason: 'checked_in' | 'already_alerted' | 'no_doctor' }
    | { kind: 'error'; patientId: string; error: string };

  async function processPatient(patient: {
    id: string;
    assigned_doctor_id: string | null;
  }): Promise<PatientOutcome> {
    try {
      if (!patient.assigned_doctor_id) {
        // Nobody to alert. Same bail-out as generate-weekly-reports — a skip,
        // not an error.
        return { kind: 'skipped', reason: 'no_doctor' };
      }

      // Did they check in today, and have we already alerted today? Both reads
      // are independent — run them together, same reasoning as the outer
      // concurrency.
      const [
        { count: checkinCount, error: checkinError },
        { count: existingAlertCount, error: alertLookupError },
      ] = await Promise.all([
        adminClient
          .from('checkins')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .eq('date', today),
        adminClient
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', patient.id)
          .eq('type', 'missed_checkin')
          .gte('created_at', dayStartIso)
          .lt('created_at', dayEndIso),
      ]);
      if (checkinError) throw new Error(checkinError.message);
      if (alertLookupError) throw new Error(alertLookupError.message);

      if ((checkinCount ?? 0) > 0) {
        return { kind: 'skipped', reason: 'checked_in' };
      }
      if ((existingAlertCount ?? 0) > 0) {
        // Already handled today — a cron retry or manual re-trigger must not
        // double-alert the doctor or double-push the patient.
        return { kind: 'skipped', reason: 'already_alerted' };
      }

      // Service role for BOTH params: it bypasses RLS entirely, which is what
      // makes the insert work with no real caller session behind it.
      const alertResult = await sendDoctorAlert({
        callerClient: adminClient,
        serviceRoleClient: adminClient,
        patientId: patient.id,
        doctorId: patient.assigned_doctor_id,
        type: 'missed_checkin',
        // A single missed check-in is routine, not an emergency.
        urgency: 'low',
        explanation: 'Patient has not submitted a check-in today (Mauritius time).',
      });
      if ('error' in alertResult) throw new Error(alertResult.error);

      const patientReminderSent = await sendPatientReminder(adminClient, patient.id);
      return { kind: 'alerted', patientReminderSent };
    } catch (err) {
      return { kind: 'error', patientId: patient.id, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Promise.allSettled, not Promise.all — one patient throwing (it shouldn't,
  // processPatient catches its own errors, but this is a second, structural
  // safety net) must never take down every other patient's already-resolved
  // result.
  const settled = await Promise.allSettled((patients ?? []).map(processPatient));

  let alertsRaised = 0;
  let patientRemindersSent = 0;
  const skipped = { checkedIn: 0, alreadyAlerted: 0, noAssignedDoctor: 0 };
  const errors: { patientId: string; error: string }[] = [];

  settled.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors.push({ patientId: patients?.[i]?.id ?? 'unknown', error: String(result.reason) });
      return;
    }
    const outcome = result.value;
    if (outcome.kind === 'alerted') {
      alertsRaised++;
      if (outcome.patientReminderSent) patientRemindersSent++;
    } else if (outcome.kind === 'skipped') {
      if (outcome.reason === 'checked_in') skipped.checkedIn++;
      else if (outcome.reason === 'already_alerted') skipped.alreadyAlerted++;
      else skipped.noAssignedDoctor++;
    } else {
      errors.push({ patientId: outcome.patientId, error: outcome.error });
    }
  });

  return jsonResponse(
    {
      date: today,
      patientsProcessed: patients?.length ?? 0,
      alertsRaised,
      patientRemindersSent,
      skipped,
      errors,
    },
    200
  );
});
