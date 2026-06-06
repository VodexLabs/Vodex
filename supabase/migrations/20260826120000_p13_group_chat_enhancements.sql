-- P1.3: Group chat typing + read receipts
alter table public.group_members
  add column if not exists last_read_at timestamptz,
  add column if not exists last_typing_at timestamptz;

create index if not exists group_members_group_last_read_idx
  on public.group_members (group_id, last_read_at desc);

grant update on public.group_members to authenticated;

drop policy if exists "group_members: update self read" on public.group_members;
create policy "group_members: update self read"
  on public.group_members for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
