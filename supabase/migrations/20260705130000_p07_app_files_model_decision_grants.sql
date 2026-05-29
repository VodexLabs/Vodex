-- P0.7: service_role must persist generated app_files; model_decision_logs insert grants.

grant select, insert, update, delete on table public.app_files to service_role;
grant select, insert, update, delete on table public.app_files to authenticated;

grant all on table public.model_decision_logs to service_role;
grant select on table public.model_decision_logs to postgres;

revoke insert, update, delete on table public.model_decision_logs from anon;
revoke insert, update, delete on table public.model_decision_logs from authenticated;

notify pgrst, 'reload schema';
