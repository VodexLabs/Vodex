-- P0.14: preview_sessions provider metadata (required by preview-build-service insert)

alter table public.preview_sessions
  add column if not exists provider_level text,
  add column if not exists external_url text;

comment on column public.preview_sessions.provider_level is
  'in_app_sandbox | vercel_hosted | etc.';
comment on column public.preview_sessions.external_url is
  'Optional hosted preview URL when provider deploys externally';

notify pgrst, 'reload schema';
