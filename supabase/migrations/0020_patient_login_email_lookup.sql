-- ============================================================================
-- 0020 — patient self-service password reset: username → current login email
--
-- Patients log in with a doctor-assigned username, which the app has always
-- turned into the synthetic auth address {username}@patients.recovai.internal
-- by a pure string transform, with no database lookup (see login.tsx and the
-- 0001_initial_schema.sql header).
--
-- Phase 7 lets a patient swap that synthetic address for their real
-- contact_email (see the sync-patient-login-email Edge Function), so the login
-- email is no longer derivable from the username alone — it must be read from
-- the live auth.users row. This function is that lookup: given a username, it
-- returns the CURRENT actual auth.users.email, reading the single source of
-- truth directly rather than maintaining a second, drift-prone mirror column.
--
-- SECURITY DEFINER + hardened search_path, following 0018's
-- my_assigned_doctor_id() precedent exactly: the function reads auth.users
-- (which the anon role cannot read directly) as its owner. It is granted to
-- anon BECAUSE login happens before the user is authenticated.
--
-- It returns NULL when no patient has that username. Callers must not surface a
-- NULL (or an error) as anything different from a wrong password — otherwise
-- the existence of a username could be probed. (The returned email is only ever
-- consumed as the address to sign in / send a recovery mail to, never shown.)
-- ============================================================================

create or replace function public.get_patient_login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.username = p_username
    and p.role = 'patient'
$$;

-- Login runs before the user is authenticated, so the anon role must be able
-- to resolve a username to its current login email.
grant execute on function public.get_patient_login_email(text) to anon;
