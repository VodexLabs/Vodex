-- Group chat replies + reactions

alter table public.group_messages
  add column if not exists parent_message_id uuid references public.group_messages(id) on delete cascade;

create table if not exists public.group_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.group_message_reactions enable row level security;

drop policy if exists "group_message_reactions: read" on public.group_message_reactions;
create policy "group_message_reactions: read"
  on public.group_message_reactions for select using (true);

drop policy if exists "group_message_reactions: insert own" on public.group_message_reactions;
create policy "group_message_reactions: insert own"
  on public.group_message_reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "group_message_reactions: delete own" on public.group_message_reactions;
create policy "group_message_reactions: delete own"
  on public.group_message_reactions for delete
  using (auth.uid() = user_id);

grant select, insert, delete on public.group_message_reactions to authenticated;
