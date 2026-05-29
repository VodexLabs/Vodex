-- P0.14: allow build worker (user JWT or service role) to create preview sessions

drop policy if exists "Users insert own preview sessions" on public.preview_sessions;
create policy "Users insert own preview sessions"
  on public.preview_sessions for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own preview sessions" on public.preview_sessions;
create policy "Users update own preview sessions"
  on public.preview_sessions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

notify pgrst, 'reload schema';
