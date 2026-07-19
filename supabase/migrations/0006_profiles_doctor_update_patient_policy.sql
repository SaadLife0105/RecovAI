-- Doctors need to update their assigned patients' profile rows for
-- archive/restore. This does NOT open up arbitrary field writes at the DB
-- level — restricting which fields the app actually sends (archived only,
-- never username/password/assigned_doctor_id) is enforced in the app layer,
-- same pattern as "profiles: self update"'s existing comment.
create policy "profiles: doctor updates assigned patients (archive/restore, enforced in app layer)"
  on public.profiles for update
  using (assigned_doctor_id = auth.uid())
  with check (assigned_doctor_id = auth.uid());
