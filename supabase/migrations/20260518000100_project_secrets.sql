-- Encrypted project-level secrets (API keys for integrations).
-- Values are ciphertext only; never store plaintext. Access via service role after owner check in Next.js API routes.

create table if not exists public.project_secrets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key_name text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, key_name)
);

comment on table public.project_secrets is 'Per-project integration secrets (encrypted at rest).';

create index if not exists project_secrets_project_id_idx on public.project_secrets (project_id);

alter table public.project_secrets enable row level security;

-- No user-facing policies: all access via service role from Next API routes after owner check.

create trigger set_project_secrets_updated_at
  before update on public.project_secrets
  for each row
  execute function public.handle_updated_at();

notify pgrst, 'reload schema';
