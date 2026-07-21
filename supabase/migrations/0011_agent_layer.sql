-- ============================================================================
-- RecovAI — Phase 5 agent layer (Development Plan.md §5.0, §5.2)
-- Adds the agent's audit trail (agent_runs), the persistent urgent-review
-- flag the agent can raise and only a doctor can clear, and the stored
-- language preference send_patient_message translates against.
-- RLS ships here with each object, per CLAUDE.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- agent_runs — one row per risk-agent invocation, on EVERY exit path
-- (normal, fallback, timeout, truncation, hard error). Dissertation evidence
-- for §5.2, and the only place the agent's reasoning is recoverable after
-- the fact.
-- ---------------------------------------------------------------------------
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  checkin_date date not null,
  input_context jsonb not null,
  reasoning_summary text,
  tool_calls jsonb not null default '[]'::jsonb,
  iterations int not null default 0,
  truncated boolean not null default false,
  -- 'no_action' | 'alerted' | 'messaged_patient' | 'flagged' | 'multi_action'
  -- | 'agent_error_fallback' | 'truncated_fallback' | 'timeout_fallback'
  -- Left as free text rather than an enum: the outcome vocabulary is still
  -- moving while the scenario suite (§5.3) is being written.
  outcome text not null,
  created_at timestamptz not null default now()
);

create index agent_runs_patient_created_idx
  on public.agent_runs (patient_id, created_at desc);

alter table public.agent_runs enable row level security;

-- Doctor-read only, mirroring "zone_breaches: doctor reads assigned patients".
-- Deliberately NO patient policy (default-deny): this is a clinical audit
-- trail, not patient-facing content — same reasoning as kb_documents being
-- service-role-only. Also no INSERT policy for any authenticated role: writes
-- only ever happen from the risk-agent Edge Function via the service role,
-- which bypasses RLS.
create policy "agent_runs: doctor reads assigned patients"
  on public.agent_runs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = agent_runs.patient_id and p.assigned_doctor_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- profiles.flagged_for_urgent_review — ongoing STATE (the agent raises it,
-- only a doctor clears it), not a one-off alerts row. See §5.0 point 2.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column flagged_for_urgent_review boolean not null default false;

-- No new RLS policy is needed for the doctor's side: 0006's
-- "profiles: doctor updates assigned patients" already grants UPDATE on the
-- whole row to the assigned doctor, and 0001's "profiles: self read" /
-- "profiles: doctor reads own patients" already cover reads.
--
-- What IS missing is the other direction: 0001's "profiles: self update"
-- policy lets a patient update ANY column of their own row, which would let a
-- patient set (or silently clear) their own urgent-review flag. Postgres RLS
-- policies cannot be scoped to a column, and column-level GRANTs can't help
-- either — doctors and patients are both the `authenticated` role, so
-- revoking UPDATE(flagged_for_urgent_review) from `authenticated` would block
-- the doctor too. So this is enforced with a trigger instead, the same way
-- 0001 enforces the profile role invariants.
--
-- auth.uid() is NULL for service-role connections (no JWT subject), which is
-- exactly how the risk-agent Edge Function's flag_for_urgent_review tool is
-- allowed through.
create function public.enforce_flag_changed_by_doctor_only()
returns trigger as $$
begin
  if new.flagged_for_urgent_review is distinct from old.flagged_for_urgent_review
     and auth.uid() is not null
     and auth.uid() is distinct from old.assigned_doctor_id then
    raise exception 'flagged_for_urgent_review may only be changed by the assigned doctor';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_flag_changed_by_doctor_only
  before update on public.profiles
  for each row execute function public.enforce_flag_changed_by_doctor_only();

-- ---------------------------------------------------------------------------
-- profiles.preferred_language — populated opportunistically by rag-chat from
-- the [LANG:xx] marker it already parses. NULL means "never chatted, no
-- signal yet" → agent messages fall back to English, untranslated.
-- Expected values are the same Google Translate targets rag-chat uses:
-- 'en' | 'fr' | 'mfe'. Deliberately no CHECK constraint — the set may grow.
-- No RLS change needed: patients already update their own row, doctors
-- already read their assigned patients' rows.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column preferred_language text;
