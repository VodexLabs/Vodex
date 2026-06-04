-- P3.6 — notifications delivery + RLS + realtime publication repair

alter table if exists public.notifications enable row level security;

drop policy if exists "Users access own notifications" on public.notifications;
drop policy if exists "notifications: own only" on public.notifications;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own"
  on public.notifications for insert to authenticated
  with check (auth.uid() = user_id);

grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';
