// doctorAlert — the alert-creation half of the old generate-xai function
// (its Steps 5 and 6), lifted out unchanged in Phase 5 so generate-xai and
// risk-agent's send_doctor_alert tool file alerts identically.
//
// The alerts row is the primary deliverable; the push is best-effort and
// never allowed to fail the call (NFR8).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Which profiles.notify_* column mutes the PUSH for a given alert type.
 * null means "always push, no preference applies".
 *
 * 'agent_alert' maps to notify_high_risk because the agent's generic alert
 * tool only fires when the agent judged something concerning — of the four
 * preference categories a doctor is offered, that is the one it means.
 *
 * 'relapse_logged' is deliberately null, NOT a missed case: a patient
 * self-reporting a relapse is a safety event, and no toggle on a settings
 * screen should be able to silently suppress the doctor's notification of it.
 *
 * 'zone_breach' is raised by notify-zone-breach, and only for medium_risk /
 * high_risk zones — a safe or low_risk zone never reaches this function at
 * all, so this toggle gates only breaches that were already judged worth
 * alerting about.
 *
 * 'predicted_high_risk' is raised by risk-agent's flag_predicted_high_risk
 * tool, when lib/forecast.ts's real 3-day regression crosses 70. It is a
 * projection, not a score the patient actually has today, which is exactly
 * why it is a separate toggle from notify_high_risk — a doctor may
 * reasonably want the real thing and not the forecast.
 */
const PREFERENCE_COLUMN: Record<string, string | null> = {
  high_risk_score: 'notify_high_risk',
  agent_alert: 'notify_high_risk',
  missed_checkin: 'notify_missed_checkin',
  zone_breach: 'notify_zone_breach',
  predicted_high_risk: 'notify_predicted_high_risk',
  relapse_logged: null,
};

/**
 * Push notification body, per alert type. Differentiated so a doctor knows
 * what KIND of thing happened without opening the app — but still says
 * nothing about WHO or WHERE (Critical Caution #10, data minimisation): this
 * renders on a locked screen, visible to anyone who glances at the phone, not
 * just the doctor. Real detail (patient name, zone name, exact time) only
 * ever appears once they've actually opened the app and are looking at the
 * real, RLS-protected alert.
 */
const PUSH_BODY: Record<string, string> = {
  high_risk_score: "A patient's risk score needs your attention. Open the app to view details.",
  agent_alert: "A patient's risk score needs your attention. Open the app to view details.",
  missed_checkin: 'A patient missed today\'s check-in. Open the app to view details.',
  zone_breach: 'A patient entered a flagged location. Open the app to view details.',
  predicted_high_risk: "A patient's risk is forecast to rise. Open the app to view details.",
  relapse_logged: 'A patient has logged a relapse. Open the app to view details.',
};
const DEFAULT_PUSH_BODY = "A patient's alert needs your attention. Open the app to view details.";

export async function sendDoctorAlert({
  callerClient,
  serviceRoleClient,
  patientId,
  doctorId,
  type,
  urgency,
  explanation,
}: {
  callerClient: SupabaseClient;
  /** Needed only for the push step (reading ANOTHER user's push_tokens is not
   * possible under RLS). Pass null to skip pushing. */
  serviceRoleClient: SupabaseClient | null;
  patientId: string;
  doctorId: string;
  type: string;
  urgency: 'low' | 'medium' | 'high';
  explanation?: string | null;
}): Promise<{ alertId: string } | { error: string }> {
  // --- Insert the alert (caller-scoped; reuses migration 0004's
  // patient-insert policy — a patient can only name themselves + their own
  // currently-assigned doctor, so no new migration is needed). ---
  const { data: alertRow, error: alertError } = await callerClient
    .from('alerts')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      type,
      urgency,
      xai_explanation: explanation ?? null,
      read: false,
    })
    .select('id')
    .single();

  if (alertError || !alertRow) {
    return { error: `Failed to create alert: ${alertError?.message ?? 'unknown error'}` };
  }

  // --- Push to the doctor's device(s). Best-effort: any failure here is
  // logged and swallowed — the alert row above must never be lost over a push
  // failure (NFR8).
  //
  // Privacy (Development Plan.md Critical Caution #10, data minimisation): the
  // title/body are deliberately generic — NO patient name, drug class, or any
  // detail from the explanation. Push notifications surface on a locked
  // screen, and this is a vulnerable population's health data. The alertId in
  // `data` is not shown on the lock screen, only available to the app once
  // opened. ---
  // Notification preference gate — around the PUSH ONLY. The alerts row above
  // is already written and stays visible on the doctor's Alerts tab no matter
  // what: muting a type silences the intrusive notification, it never hides
  // clinical data.
  //
  // Fails OPEN. If the lookup errors, or the type has no mapping at all, the
  // push goes out — a missed real alert is worse than one unwanted push.
  //
  // Read through the SERVICE-ROLE client, for the same reason the push_tokens
  // lookup below does: the caller here is usually the PATIENT (generate-xai,
  // risk-agent), and 0001's profiles select policies only let a user read
  // their own row or their own patients' rows — a patient reading their
  // doctor's row returns nothing. Through callerClient this check would
  // silently fail open every time for high_risk_score and agent_alert, i.e.
  // the toggle would appear to work and never actually mute anything.
  // callerClient is the fallback only for the no-service-role case (where the
  // push is skipped anyway).
  const prefColumn = PREFERENCE_COLUMN[type] ?? null;
  if (prefColumn) {
    const { data: prefs, error: prefsError } = await (serviceRoleClient ?? callerClient)
      .from('profiles')
      .select(prefColumn)
      .eq('id', doctorId)
      .single();

    if (prefsError) {
      console.warn(`Notification preference lookup failed for doctor ${doctorId}: ${prefsError.message} — pushing anyway.`);
    } else if (prefs && (prefs as Record<string, boolean>)[prefColumn] === false) {
      console.log(`Push suppressed: doctor ${doctorId} has ${prefColumn} turned off (alert row still created).`);
      return { alertId: alertRow.id };
    }
  }

  try {
    if (!serviceRoleClient) {
      console.warn('Push step skipped: no service-role client was provided.');
    } else {
      const { data: tokens, error: tokensError } = await serviceRoleClient
        .from('push_tokens')
        .select('expo_push_token')
        .eq('user_id', doctorId);

      if (tokensError) {
        console.warn(`Push token lookup failed for doctor ${doctorId}: ${tokensError.message}`);
      }

      console.log(`Push step: doctorId=${doctorId}, tokens found=${tokens?.length ?? 0}`);

      const messages = (tokens ?? []).map((t: { expo_push_token: string }) => ({
        to: t.expo_push_token,
        title: 'RecovAI Alert',
        body: PUSH_BODY[type] ?? DEFAULT_PUSH_BODY,
        data: { alertId: alertRow.id },
      }));

      if (messages.length === 0) {
        console.warn(`Push step: no push_tokens rows for doctor ${doctorId} — nothing to send.`);
      } else {
        const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(messages),
        });
        const pushResText = await pushRes.text();
        console.log(`Push step: Expo API responded ${pushRes.status}: ${pushResText}`);
        if (!pushRes.ok) {
          console.warn(`Expo push failed (${pushRes.status}): ${pushResText}`);
        }
      }
    }
  } catch (e) {
    console.warn(`Push notification step failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { alertId: alertRow.id };
}
