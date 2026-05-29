-- P0.16: table-level grants for published_apps (service_role publish upsert)

grant select, insert, update, delete on public.published_apps to authenticated;
grant select, insert, update, delete on public.published_apps to service_role;
