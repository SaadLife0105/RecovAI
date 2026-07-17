-- Patients may insert an alert only naming themselves as the patient and
-- only for their own currently-assigned doctor — this is the RLS trust
-- boundary for patient-initiated alerts (relapse logging). AI-agent-
-- generated alerts (high_risk, missed_checkin, predicted_high_risk) are
-- inserted server-side via the service role instead, not through this
-- policy — see Development Plan.md's autonomous agent section.
create policy "alerts: patient inserts for own assigned doctor"
  on public.alerts for insert
  with check (
    patient_id = auth.uid()
    and doctor_id = (
      select assigned_doctor_id from public.profiles where id = auth.uid()
    )
  );
