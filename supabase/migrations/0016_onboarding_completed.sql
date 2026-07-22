-- ============================================================================
-- RecovAI — first-login onboarding walkthrough flag (Development Plan.md §6)
--
-- Read by app/(patient)/_layout.tsx (the single gate) and written by
-- app/(patient)/onboarding.tsx when the patient finishes or skips.
--
-- Default TRUE, not false: this column only means anything for patients, and
-- defaulting it true means every account that already exists is treated as
-- "already onboarded" — nobody using the app today is ambushed by a
-- walkthrough on their next launch. Only genuinely new patients see it, via
-- the explicit `onboarding_completed: false` in the create-patient Edge
-- Function — the only place a row is ever created with this false.
--
-- No RLS changes: profiles' existing self-read and self-update policies
-- already cover a patient reading and writing their own row, and this column
-- is on that same row.
-- ============================================================================

alter table public.profiles
  add column onboarding_completed boolean not null default true;
