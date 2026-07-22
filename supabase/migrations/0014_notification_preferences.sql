-- ============================================================================
-- RecovAI — doctor notification preferences (Development Plan.md §6)
--
-- Backs the Alert Preferences screen, which until now was local state that
-- persisted nowhere. Read and written by the doctor's own session; read by
-- _shared/doctorAlert.ts before sending a push.
--
-- Default TRUE, not null: every doctor that already exists keeps receiving
-- every alert until they explicitly turn one off. Defaulting these to false
-- (or nullable, with a null meaning "unset") would silently mute live alerts
-- for existing accounts the moment this migration ran — a safety regression,
-- not a neutral default.
--
-- No RLS changes. profiles' existing self-read and self-update policies
-- already cover a doctor reading and writing their own row, and these columns
-- are on that same row.
--
-- notify_zone_breach and notify_predicted_high_risk are created here with the
-- other two, but nothing reads them yet: neither alert type is ever raised in
-- the current build. Stages 2 and 3 add those features and wire these up.
-- ============================================================================

alter table public.profiles
  add column notify_high_risk boolean not null default true,
  add column notify_missed_checkin boolean not null default true,
  add column notify_zone_breach boolean not null default true,
  add column notify_predicted_high_risk boolean not null default true;
