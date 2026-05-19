-- In-app contact / sales lead capture (written via service role from API).
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('sales', 'support')),
  name text not null,
  email text not null,
  company text,
  team_size text,
  expected_usage text,
  current_plan text,
  message text not null
);

create index if not exists contact_requests_created_at_idx
  on public.contact_requests (created_at desc);

alter table public.contact_requests enable row level security;

-- No client policies — inserts only via service role API.
