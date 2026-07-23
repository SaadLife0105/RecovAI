-- ============================================================================
-- RecovAI — patient reminder + notification preferences (Phase 7)
--
-- The patient-side counterpart to 0014's doctor columns. Backs the new
-- (patient)/notification-preferences.tsx screen, which replaces four dead rows
-- that displayed a hardcoded mock ("8:00 PM" / "Enabled") and persisted
-- nothing.
--
-- TWO DIFFERENT DEFAULTS, on purpose — this is the important part:
--
--   notify_patient_missed_checkin / notify_patient_agent_message default TRUE,
--   for exactly the reason 0014's header gives. Both gate a push that ALREADY
--   fires today (generate-missed-checkin-alerts' gentle nudge, and risk-agent's
--   send_patient_message tool). Defaulting them false would silently mute live
--   behaviour for every existing patient the moment this migration ran — a
--   regression, not a neutral default.
--
--   checkin_reminder_enabled defaults FALSE, the opposite, and for the
--   opposite reason. The daily reminder is a NEW, additive behaviour: no
--   patient has one scheduled today, and nothing is muted by leaving it off.
--   Defaulting it true would start pushing a daily notification at every
--   existing patient without them ever asking for one — opting people into a
--   new interruption is not a neutral default either.
--
-- checkin_reminder_time is 24-hour "HH:mm" text (not a `time` column) because
-- it is only ever read back into JS to be split into hour/minute for
-- expo-notifications' DailyTriggerInput; a text round-trip avoids Postgres
-- time-type formatting differences for zero benefit. Defaults to 20:00 (8:00
-- PM), matching the default the removed mock constant implied.
--
-- Unlike the notify_* columns, the reminder pair is enforced ENTIRELY on the
-- device (lib/checkinReminder.ts schedules a local notification — no server,
-- no push). The columns exist so the choice survives a reinstall and can be
-- re-applied on next launch from (patient)/_layout.tsx.
--
-- No RLS changes needed. Confirmed by re-reading 0001: "profiles: self read"
-- and "profiles: self update" are both row-scoped (id = auth.uid()), never
-- column-scoped — the same confirmation 0017 and 0018 recorded — so a patient
-- can already read and write these four columns on their own row.
-- ============================================================================

alter table public.profiles
  add column checkin_reminder_enabled boolean not null default false,
  add column checkin_reminder_time text not null default '20:00',
  add column notify_patient_missed_checkin boolean not null default true,
  add column notify_patient_agent_message boolean not null default true;
