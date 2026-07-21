// doctorAlert — the alert-creation half of the old generate-xai function
// (its Steps 5 and 6), lifted out unchanged in Phase 5 so generate-xai and
// risk-agent's send_doctor_alert tool file alerts identically.
//
// The alerts row is the primary deliverable; the push is best-effort and
// never allowed to fail the call (NFR8).

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

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
        body: "A patient's risk score needs your attention. Open the app to view details.",
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
