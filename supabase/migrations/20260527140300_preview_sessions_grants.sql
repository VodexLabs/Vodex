-- P0.14: table-level grants for preview_sessions (RLS policies alone are insufficient)

grant select, insert, update, delete on public.preview_sessions to authenticated;
grant select, insert, update, delete on public.preview_sessions to service_role;

notify pgrst, 'reload schema';
