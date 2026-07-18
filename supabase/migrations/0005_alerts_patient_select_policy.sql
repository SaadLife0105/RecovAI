-- Patients previously had zero read access to alerts (only a doctor-full-access
-- policy and a patient-insert-only policy existed) — the patient-facing
-- alerts screen needs this to show alerts about the signed-in patient.
create policy "alerts: patient reads own"
  on public.alerts for select
  using (patient_id = auth.uid());
