-- ============================================================================
-- RecovAI — live alerts via Supabase Realtime (Development Plan.md §6)
--
-- useAlerts.ts only ever fetched once on mount, with no refetch-on-focus (the
-- fix usePatients.ts got back in Phase 3.2). A doctor sitting on the Alerts
-- tab when a new alert lands (from generate-xai, risk-agent, or the
-- missed-check-in cron) never sees it appear — confirmed directly 2026-07-22:
-- an alert created by a background process did not show up until the screen
-- was navigated away from and back.
--
-- Fixed with a genuine Realtime subscription rather than polling: this one
-- statement adds `alerts` to Supabase's built-in realtime publication, which
-- is the server-side prerequisite for any postgres_changes subscription on
-- this table. RLS still applies to what a subscribed client actually
-- receives — a doctor's subscription only ever delivers rows their own
-- "alerts: doctor full access to own" policy would let them SELECT anyway.
-- ============================================================================

alter publication supabase_realtime add table public.alerts;
