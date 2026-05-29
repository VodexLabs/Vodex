-- P0.7: service_role must read/write credit economy tables (RLS bypass still needs GRANT).

grant select, insert, update, delete on public.credit_reservations to service_role;
grant select, insert, update, delete on public.generation_cost_audits to service_role;
grant select, insert, update on public.credit_quotes to service_role;

grant select on public.credit_reservations to authenticated;
grant select on public.generation_cost_audits to authenticated;
grant select on public.credit_quotes to authenticated;

grant select, insert, update, delete on public.action_credit_balances to service_role;
grant select on public.action_credit_balances to authenticated;

notify pgrst, 'reload schema';
