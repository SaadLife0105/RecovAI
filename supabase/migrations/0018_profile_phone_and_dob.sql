-- ============================================================================
-- 0018 — profile phone + date of birth, and the patient→doctor profile read
--
-- `phone` is shared across BOTH roles, deliberately:
--   * patients set it on their own edit-profile screen;
--   * doctors set it on the new doctor edit-profile screen, and it is then
--     surfaced to their assigned patients (patient profile.tsx's "Assigned
--     Doctor" card) so a patient has a real way to reach their doctor.
--
-- `date_of_birth` is patient-only in practice (the doctor edit screen has no
-- DOB field) but lives on the shared table like sobriety_start_date does.
--
-- The two new columns need NO update-policy change: 0001's "profiles: self
-- update" is row-scoped (using (id = auth.uid())), not column-scoped — same
-- as noted in 0017's header — so both roles can already write them on their
-- own row. Confirmed by re-reading 0001, not assumed.
-- ============================================================================

alter table public.profiles add column phone text;
alter table public.profiles add column date_of_birth date;

-- ---------------------------------------------------------------------------
-- Patient reads their assigned doctor's profile row
--
-- Pre-existing gap found while wiring the doctor's phone through to patients:
-- NO select policy on `profiles` has ever permitted a patient to read their
-- assigned doctor's row.
--   * "profiles: self read"              → id = auth.uid(); the doctor's row
--                                          is not the patient's own row.
--   * "profiles: doctor reads own patients" → assigned_doctor_id = auth.uid()
--                                          or id = auth.uid(); evaluated
--                                          against the DOCTOR's row, whose
--                                          assigned_doctor_id is NULL and
--                                          whose id is not the patient's.
-- So usePatientProfile.ts's follow-up query for the doctor's full_name has
-- been silently filtered to zero rows all along, leaving assignedDoctorName
-- permanently null on the patient profile screen. Without this policy the
-- doctor's phone would land in exactly the same hole, so it is fixed here
-- rather than deferred — it is the direct blocker for this bundle's feature.
--
-- The obvious policy body — a subquery selecting from `profiles` — cannot be
-- used: a policy ON profiles that reads profiles recurses (Postgres raises
-- "infinite recursion detected in policy"). Other tables' policies subquery
-- profiles freely (see 0004's alerts policy) because they are not themselves
-- on profiles. The standard escape is a SECURITY DEFINER function, which runs
-- as its owner and so is not re-filtered by this policy.
-- ---------------------------------------------------------------------------

create or replace function public.my_assigned_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select assigned_doctor_id from public.profiles where id = auth.uid()
$$;

create policy "profiles: patient reads own assigned doctor"
  on public.profiles for select
  using (id = public.my_assigned_doctor_id());
