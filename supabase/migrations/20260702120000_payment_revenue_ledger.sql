-- Revenue ledger + customer/subscription tables for generated app payments.

alter table public.payment_provider_connections
  drop constraint if exists payment_provider_connections_status_check;

alter table public.payment_provider_connections
  add constraint payment_provider_connections_status_check check (
    status in (
      'not_connected',
      'missing_config',
      'connected',
      'verified',
      'webhook_missing',
      'webhook_verified',
      'error',
      'disabled'
    )
  );

create table if not exists public.generated_app_customers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  external_customer_id text not null,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider, external_customer_id)
);

create table if not exists public.generated_app_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  customer_id uuid references public.generated_app_customers (id) on delete set null,
  provider text not null,
  external_subscription_id text not null,
  status text not null default 'unknown',
  product_id uuid references public.project_payment_products (id) on delete set null,
  local_entitlement_key text,
  current_period_end timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider, external_subscription_id)
);

create table if not exists public.generated_app_revenue_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  external_customer_id text,
  external_subscription_id text,
  external_checkout_id text,
  event_type text not null,
  amount_cents int not null default 0,
  currency text not null default 'USD',
  status text not null default 'succeeded',
  product_id uuid references public.project_payment_products (id) on delete set null,
  local_entitlement_key text,
  occurred_at timestamptz not null default now(),
  raw_event_id uuid references public.payment_webhook_events (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, provider, external_event_id)
);

create index if not exists generated_app_revenue_events_owner_idx
  on public.generated_app_revenue_events (owner_user_id, occurred_at desc);

create index if not exists generated_app_revenue_events_project_idx
  on public.generated_app_revenue_events (project_id, occurred_at desc);

create table if not exists public.generated_app_entitlements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  customer_id uuid references public.generated_app_customers (id) on delete cascade,
  entitlement_key text not null,
  active boolean not null default true,
  source text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, customer_id, entitlement_key)
);

alter table public.generated_app_customers enable row level security;
alter table public.generated_app_subscriptions enable row level security;
alter table public.generated_app_revenue_events enable row level security;
alter table public.generated_app_entitlements enable row level security;

drop policy if exists "gen_customers: owner" on public.generated_app_customers;
create policy "gen_customers: owner"
  on public.generated_app_customers for all
  using (
    exists (select 1 from public.projects p where p.id = generated_app_customers.project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = generated_app_customers.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "gen_revenue: owner read" on public.generated_app_revenue_events;
create policy "gen_revenue: owner read"
  on public.generated_app_revenue_events for select
  using (owner_user_id = auth.uid());

drop policy if exists "gen_subs: owner" on public.generated_app_subscriptions;
create policy "gen_subs: owner"
  on public.generated_app_subscriptions for select
  using (
    exists (select 1 from public.projects p where p.id = generated_app_subscriptions.project_id and p.owner_id = auth.uid())
  );

drop policy if exists "gen_entitlements: owner" on public.generated_app_entitlements;
create policy "gen_entitlements: owner"
  on public.generated_app_entitlements for select
  using (
    exists (select 1 from public.projects p where p.id = generated_app_entitlements.project_id and p.owner_id = auth.uid())
  );

grant select on public.generated_app_customers to authenticated;
grant select on public.generated_app_subscriptions to authenticated;
grant select on public.generated_app_revenue_events to authenticated;
grant select on public.generated_app_entitlements to authenticated;

grant all on public.generated_app_customers to service_role;
grant all on public.generated_app_subscriptions to service_role;
grant all on public.generated_app_revenue_events to service_role;
grant all on public.generated_app_entitlements to service_role;

notify pgrst, 'reload schema';
