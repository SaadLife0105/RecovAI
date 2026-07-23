-- ============================================================================
-- 0017 — patient avatar + real contact email
--
-- Both are captured in the first-login walkthrough ((patient)/onboarding.tsx),
-- both nullable: pre-existing accounts have onboarding_completed = true and so
-- never pass through the new steps, and the walkthrough's Skip button
-- deliberately completes onboarding without requiring either.
--
-- contact_email is NOT auth.users.email. Patients sign in with a synthetic
-- {username}@patients.recovai.internal address (see 0001's header note); this
-- column stores a real, reachable address for the password-reset flow to use
-- later, without disturbing that login convention.
--
-- No RLS change needed: 0001's "profiles: self update" policy is row-scoped
-- (using (id = auth.uid())), not column-scoped, so a patient can already
-- write these two columns on their own row.
-- ============================================================================

alter table public.profiles add column avatar_key text;
alter table public.profiles add column contact_email text;
