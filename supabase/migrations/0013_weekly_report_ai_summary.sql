-- ============================================================================
-- RecovAI — AI week summary on weekly_reports (Development Plan.md §6)
--
-- Nullable: a report row is created by the Monday cron with no summary, and
-- the summary is generated lazily the first time a doctor expands that week's
-- card in Patient Detail → Reports. Non-null means "already generated" —
-- generate-weekly-report-summary uses exactly that as its cache check, so it
-- never pays for the same week twice.
--
-- No RLS change. 0012's "weekly_reports: doctor reads own patients" select
-- policy already covers reading this column, and writes still only ever
-- happen through the service role (the new Edge Function does its one update
-- with the service-role client, the same way _shared/doctorAlert.ts reaches
-- for a privileged client inside an otherwise caller-scoped flow). Adding a
-- doctor UPDATE policy would let the app write clinical summary text
-- directly, which is not something the client should ever be able to do.
-- ============================================================================

alter table public.weekly_reports add column ai_summary text;
