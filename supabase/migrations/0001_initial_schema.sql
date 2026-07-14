-- ============================================================================
-- RecovAI — Initial schema (Phase 1.2, Development Plan.md §1.2)
-- Every table ships with its RLS policies in this same migration, per
-- CLAUDE.md's rule: "RLS ships with the migration that creates the table,
-- not after."
--
-- Auth note: patients log in with a doctor-assigned username, not email.
-- Supabase Auth's built-in flow is email/password only, so patient accounts
-- are created (via the create-patient Edge Function, service role only)
-- with a synthetic internal email of the form
--   {username}@patients.recovai.internal
-- and the real, doctor-visible username lives in profiles.username.
-- Doctors self-register with a real email and have username = NULL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector;
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('patient', 'doctor');

-- Six-class drug taxonomy — see lib/types.ts DrugClass and
-- Development Plan.md §1.3. Do not add individual-drug values here.
create type drug_class as enum (
  'cannabis',
  'synthetic_cannabinoids',
  'heroin_opioids',
  'stimulants',
  'sedatives_benzo',
  'other_polydrug'
);

create type risk_urgency as enum ('low', 'medium', 'high');
create type zone_classification as enum ('safe', 'risk');
create type chat_role as enum ('user', 'assistant');
-- Note: no weekly_reports table in this migration — that's Phase 6
-- (Development Plan.md §6), generated on-demand/by cron, not part of the
-- Phase 1.2 schema list. risk_band (low/medium/high) will be introduced
-- there rather than left unused here.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  full_name text not null,
  username text unique, -- patients only; NULL for doctors
  assigned_doctor_id uuid references public.profiles (id) on delete set null,
  archived boolean not null default false,
  sobriety_start_date date,
  created_at timestamptz not null default now()
);

-- A patient's assigned_doctor_id must actually point at a doctor, and a
-- doctor's assigned_doctor_id must be NULL. Enforced with a trigger rather
-- than a CHECK constraint since it needs to look at another row.
create function public.enforce_profile_role_invariants()
returns trigger as $$
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
$$ language plpgsql;

create trigger trg_enforce_profile_role_invariants
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_role_invariants();

alter table public.profiles enable row level security;

create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: doctor reads own patients"
  on public.profiles for select
  using (
    assigned_doctor_id = auth.uid()
    or id = auth.uid()
  );

create policy "profiles: self update (non-clinical fields only enforced in app layer)"
  on public.profiles for update
  using (id = auth.uid());

-- No client-side insert policy: doctor rows are created via the Auth
-- signup trigger (below); patient rows are created only by the
-- create-patient Edge Function using the service role, which bypasses RLS.

-- Auto-create a profiles row when a DOCTOR self-registers via Supabase Auth's
-- public signup. Patient accounts are also auth.users rows (synthetic email,
-- see header note) but are created by the create-patient Edge Function using
-- the service role, which inserts the patient's profiles row itself
-- (including username, assigned_doctor_id, full_name) — so this trigger must
-- skip those and only handle genuine doctor self-signup. The Edge Function
-- passes { role: 'patient' } in the new user's metadata to signal this.
create function public.handle_new_doctor_signup()
returns trigger as $$
begin
  if (new.raw_user_meta_data ->> 'role') = 'patient' then
    return new; -- Edge Function will insert the profiles row itself
  end if;
  insert into public.profiles (id, role, full_name)
  values (new.id, 'doctor', coalesce(new.raw_user_meta_data ->> 'full_name', 'New Doctor'));
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_handle_new_doctor_signup
  after insert on auth.users
  for each row execute function public.handle_new_doctor_signup();

-- ---------------------------------------------------------------------------
-- push_tokens
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

alter table public.push_tokens enable row level security;

create policy "push_tokens: owner full access"
  on public.push_tokens for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- checkins
-- ---------------------------------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  mood smallint not null check (mood between 1 and 10),
  sleep smallint not null check (sleep between 1 and 10),
  craving smallint not null check (craving between 1 and 10),
  isolated boolean not null default false,
  steps integer not null default 0 check (steps >= 0),
  risk_score numeric(5, 2) not null check (risk_score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (patient_id, date)
);

alter table public.checkins enable row level security;

create policy "checkins: patient full access to own"
  on public.checkins for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "checkins: doctor reads assigned patients"
  on public.checkins for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = checkins.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- patient_substances
-- ---------------------------------------------------------------------------
create table public.patient_substances (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  drug_class drug_class not null,
  is_primary boolean not null default false,
  recovery_start_date date not null,
  unique (patient_id, drug_class)
);

-- Only one primary class per patient — enforced at the DB level.
create unique index patient_substances_one_primary_per_patient
  on public.patient_substances (patient_id)
  where (is_primary);

alter table public.patient_substances enable row level security;

create policy "patient_substances: patient reads own (view only, per FR31)"
  on public.patient_substances for select
  using (patient_id = auth.uid());

create policy "patient_substances: doctor full access to assigned patients"
  on public.patient_substances for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = patient_substances.patient_id and p.assigned_doctor_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = patient_substances.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- risk_zones
-- ---------------------------------------------------------------------------
create table public.risk_zones (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  radius_m integer not null check (radius_m between 100 and 1000),
  zone_type text not null check (
    zone_type in ('bar_nightclub', 'drug_market', 'friends_house', 'workplace', 'home', 'other')
  ),
  classification zone_classification not null,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.risk_zones enable row level security;

create policy "risk_zones: doctor full access to own zones"
  on public.risk_zones for all
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "risk_zones: patient reads own zones (needed for on-device proximity checks)"
  on public.risk_zones for select
  using (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- zone_breaches
-- ---------------------------------------------------------------------------
create table public.zone_breaches (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  zone_id uuid not null references public.risk_zones (id) on delete cascade,
  detected_at timestamptz not null default now()
);

alter table public.zone_breaches enable row level security;

create policy "zone_breaches: patient inserts and reads own"
  on public.zone_breaches for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "zone_breaches: doctor reads assigned patients"
  on public.zone_breaches for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = zone_breaches.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  urgency risk_urgency not null,
  xai_explanation text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.alerts enable row level security;

-- No patient policy at all — alerts are for the doctor's dashboard only.
create policy "alerts: doctor full access to own"
  on public.alerts for all
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- journal_entries — patient-only, no doctor policy at all (NFR5)
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  mood_level text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "journal_entries: patient-only, full access to own"
  on public.journal_entries for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- Deliberately no doctor-facing policy of any kind on this table.

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  role chat_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages: patient full access to own conversation"
  on public.chat_messages for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- No doctor policy — the rag-chat Edge Function inserts assistant replies
-- using the service role, which bypasses RLS entirely.

-- ---------------------------------------------------------------------------
-- doctor_notes — private to the doctor, not patient-visible
-- ---------------------------------------------------------------------------
create table public.doctor_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doctor_notes enable row level security;

create policy "doctor_notes: doctor full access to own notes"
  on public.doctor_notes for all
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- kb_documents — RAG knowledge base. RLS enabled, zero client policies:
-- only the service role (used by Edge Functions) can ever touch this table.
-- Embedding dimension is 384 to match the gte-small model (Development
-- Plan.md §4.1) — changing embedding models later requires a new migration
-- AND re-embedding the entire knowledge base.
-- ---------------------------------------------------------------------------
create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(384) not null,
  source text not null,
  category text not null,
  drug_class drug_class, -- NULL = general content applicable to all classes
  created_at timestamptz not null default now()
);

alter table public.kb_documents enable row level security;
-- No policies created: default-deny for anon/authenticated roles.

create index kb_documents_embedding_idx
  on public.kb_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
-- lists=100 is a placeholder — ivfflat's rule of thumb is lists ~ sqrt(row
-- count). Revisit once the real knowledge base is populated (Phase 4.1);
-- 100 is fine for a small prototype KB but not tuned to anything yet.

-- match_documents: returns chunks matching the patient's drug class OR
-- general (NULL) content, ordered by similarity. Called only from Edge
-- Functions via the service role.
create function public.match_documents(
  query_embedding vector(384),
  match_count int,
  patient_drug_class drug_class default null
)
returns table (
  id uuid,
  content text,
  source text,
  category text,
  similarity float
)
language sql stable
as $$
  select
    kb_documents.id,
    kb_documents.content,
    kb_documents.source,
    kb_documents.category,
    1 - (kb_documents.embedding <=> query_embedding) as similarity
  from public.kb_documents
  where kb_documents.drug_class is null
     or kb_documents.drug_class = patient_drug_class
  order by kb_documents.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- streaks
-- ---------------------------------------------------------------------------
create table public.streaks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.profiles (id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_checkin_date date
);

alter table public.streaks enable row level security;

create policy "streaks: patient full access to own"
  on public.streaks for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create policy "streaks: doctor reads assigned patients"
  on public.streaks for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = streaks.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );
