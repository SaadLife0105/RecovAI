-- ============================================================================
-- RecovAI — Phase 6 weekly reports (Development Plan.md §6)
-- The weekly_reports table 0001's enum block deferred to here, plus the
-- risk_band enum it said would be introduced with it.
--
-- In-app only: there is no email delivery (explicitly decided against —
-- the Plan's original "HTML email via Resend" line is superseded). Rows are
-- written solely by the generate-weekly-reports Edge Function on a Monday
-- cron, using the service role; doctors read them from the Reports screen.
-- RLS ships here with the table, per CLAUDE.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- Mirrors lib/types.ts RiskBand and constants/theme.ts riskBand()'s
-- thresholds (>=70 high, >=40 medium, else low). The band is stored
-- alongside avg_risk_score rather than derived on read so a report is a
-- frozen record of the week as it was scored.
create type risk_band as enum ('low', 'medium', 'high');

-- ---------------------------------------------------------------------------
-- weekly_reports — one row per patient per reported week
-- ---------------------------------------------------------------------------
create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- Monday of the reported week (Mauritius time)
  week_end date not null,   -- Sunday of the reported week (Mauritius time)
  avg_risk_score numeric(5, 2) not null check (avg_risk_score between 0 and 100),
  band risk_band not null,
  compliance_percent smallint not null check (compliance_percent between 0 and 100),
  alert_count integer not null default 0,
  zone_breach_count integer not null default 0,
  created_at timestamptz not null default now(),
  -- Makes the generator idempotent: a re-run for a week already reported
  -- updates that row instead of duplicating it. Matters because a cron job
  -- can fire twice (retry, manual re-trigger during the viva demo).
  unique (patient_id, week_start)
);

create index weekly_reports_patient_week_idx
  on public.weekly_reports (patient_id, week_start desc);

alter table public.weekly_reports enable row level security;

-- Doctor-read only, same shape as "zone_breaches: doctor reads assigned
-- patients". Deliberately NO patient policy (default-deny): a weekly report
-- is clinical summary material for the doctor, not patient-facing content.
-- Also no INSERT/UPDATE policy for any authenticated role — writes only ever
-- happen from the generate-weekly-reports Edge Function via the service role,
-- which bypasses RLS entirely (same "service-role writes only" reasoning as
-- kb_documents, but readable by the assigned doctor here).
create policy "weekly_reports: doctor reads own patients"
  on public.weekly_reports for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = weekly_reports.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );
