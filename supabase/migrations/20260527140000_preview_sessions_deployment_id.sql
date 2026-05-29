-- P0.14: preview_sessions.deployment_id (used by preview-build-service + Vercel hosted preview)

alter table public.preview_sessions
  add column if not exists deployment_id text;

comment on column public.preview_sessions.deployment_id is
  'Optional Vercel (or other) deployment id for hosted preview polling';

create index if not exists preview_sessions_deployment_id_idx
  on public.preview_sessions (deployment_id)
  where deployment_id is not null;

create index if not exists preview_sessions_owner_project_idx
  on public.preview_sessions (owner_id, project_id, created_at desc);

alter table public.preview_sessions
  add column if not exists provider_level text,
  add column if not exists external_url text;

notify pgrst, 'reload schema';
