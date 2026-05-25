-- Repair model_decision_logs permissions (service role insert, no client writes).

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on table public.model_decision_logs to service_role;
grant select on table public.model_decision_logs to postgres;

revoke insert, update, delete on table public.model_decision_logs from anon;
revoke insert, update, delete on table public.model_decision_logs from authenticated;

notify pgrst, 'reload schema';
