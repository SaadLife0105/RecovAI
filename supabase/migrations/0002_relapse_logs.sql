-- ============================================================================
-- RecovAI — Relapse logging (Development Plan.md "Relapse logging" note)
-- A relapse is a real, patient-initiated event, tracked separately from the
-- `streaks` table (engagement/check-in streak). Logging a relapse must never
-- touch `streaks` — only `relapse_logs` (doctor-visible history) and
-- `profiles.sobriety_start_date` (reset to today, done in application code).
-- ============================================================================

create table public.relapse_logs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  logged_at timestamptz not null default now(),
  notes text
);

alter table public.relapse_logs enable row level security;

create policy "relapse_logs: patient full access to own"
  on public.relapse_logs for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "relapse_logs: doctor reads assigned patients"
  on public.relapse_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = relapse_logs.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );
