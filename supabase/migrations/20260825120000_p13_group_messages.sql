-- P1.3: Group messaging for community groups
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

grant select, insert, update on public.group_messages to authenticated;

drop policy if exists "group_messages: read members" on public.group_messages;
create policy "group_messages: read members"
  on public.group_messages for select to authenticated
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.groups g
      where g.id = group_messages.group_id and g.is_public = true
    )
  );

drop policy if exists "group_messages: insert members" on public.group_messages;
create policy "group_messages: insert members"
  on public.group_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = group_messages.group_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "group_messages: update own" on public.group_messages;
create policy "group_messages: update own"
  on public.group_messages for update to authenticated
  using (auth.uid() = user_id);
