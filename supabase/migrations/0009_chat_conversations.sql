-- ---------------------------------------------------------------------------
-- chat_conversations — splits chat_messages' single continuous stream per
-- patient into separate, browsable/reopenable conversations.
-- ---------------------------------------------------------------------------
create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table public.chat_conversations enable row level security;

create policy "chat_conversations: patient full access to own"
  on public.chat_conversations for all
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

create index chat_conversations_patient_last_message_idx
  on public.chat_conversations (patient_id, last_message_at desc);

-- ---------------------------------------------------------------------------
-- chat_messages.conversation_id — added nullable, backfilled, then locked
-- to NOT NULL so existing rows from live testing are never orphaned.
-- ---------------------------------------------------------------------------
alter table public.chat_messages
  add column conversation_id uuid references public.chat_conversations (id) on delete cascade;

-- One "Previous conversation" per patient that already has messages, then
-- assign all of that patient's existing rows to it.
insert into public.chat_conversations (patient_id, title, created_at, last_message_at)
select
  cm.patient_id,
  'Previous conversation',
  min(cm.created_at),
  max(cm.created_at)
from public.chat_messages cm
group by cm.patient_id;

update public.chat_messages cm
set conversation_id = cc.id
from public.chat_conversations cc
where cc.patient_id = cm.patient_id
  and cc.title = 'Previous conversation'
  and cm.conversation_id is null;

alter table public.chat_messages
  alter column conversation_id set not null;

create index chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);
