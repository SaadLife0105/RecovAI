-- ============================================================================
-- RecovAI — Fix enforce_profile_role_invariants() running under caller RLS
-- Without security definer, a patient's own session can't see their doctor's
-- profiles row (doctor's assigned_doctor_id is null and id != auth.uid()), so
-- the assigned_doctor_id validity check spuriously fails on any patient
-- profile update even when the referenced doctor is valid. Match the
-- handle_new_doctor_signup pattern (0001_initial_schema.sql) instead.
-- ============================================================================

create or replace function public.enforce_profile_role_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'doctor' and new.assigned_doctor_id is not null then
    raise exception 'a doctor profile cannot have assigned_doctor_id set';
  end if;
  if new.role = 'patient' and new.assigned_doctor_id is not null then
    if not exists (
      select 1 from public.profiles
      where id = new.assigned_doctor_id and role = 'doctor'
    ) then
      raise exception 'assigned_doctor_id must reference a doctor profile';
    end if;
  end if;
  if new.role = 'doctor' and new.username is not null then
    raise exception 'a doctor profile cannot have a username (doctors use email)';
  end if;
  return new;
end;
$$;
