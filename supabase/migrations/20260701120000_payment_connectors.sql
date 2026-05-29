-- Generated app payment connectors (owner-connected providers; separate from DreamOS platform billing).

create table if not exists public.payment_provider_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  provider text not null check (
    provider in ('paddle', 'stripe', 'lemon_squeezy', 'paypal', 'revenuecat')
  ),
  mode text not null default 'test' check (mode in ('test', 'live', 'sandbox')),
  status text not null default 'not_connected' check (
    status in ('not_connected', 'missing_config', 'connected', 'verified', 'error', 'disabled')
  ),
  display_name text,
  account_email text,
  external_account_id text,
  encrypted_config jsonb not null default '{}'::jsonb,
  public_config jsonb not null default '{}'::jsonb,
  product_mapping jsonb not null default '{}'::jsonb,
  webhook_config jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider)
);

create index if not exists payment_provider_connections_project_idx
  on public.payment_provider_connections (project_id);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  provider text not null,
  event_id text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_webhook_events_provider_event_uidx
  on public.payment_webhook_events (provider, event_id)
  where event_id is not null;

create table if not exists public.project_payment_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  provider text not null,
  product_type text not null check (
    product_type in ('subscription', 'one_time', 'credit_pack', 'usage')
  ),
  name text not null,
  description text,
  external_product_id text,
  external_price_id text,
  local_entitlement_key text,
  amount_cents int,
  currency text not null default 'USD',
  interval text check (interval is null or interval in ('month', 'year')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_payment_products_project_idx
  on public.project_payment_products (project_id, provider);

create table if not exists public.mobile_billing_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade unique,
  platform text not null check (platform in ('android', 'ios', 'both')),
  provider text not null default 'revenuecat',
  package_name text,
  bundle_id text,
  revenuecat_project_id text,
  revenuecat_entitlement_id text,
  revenuecat_offering_id text,
  product_ids jsonb not null default '[]'::jsonb,
  setup_status text not null default 'not_started' check (
    setup_status in ('not_started', 'needs_store_setup', 'needs_revenuecat', 'ready', 'error')
  ),
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_connector_audit_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  provider text,
  action text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.payment_provider_connections enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.project_payment_products enable row level security;
alter table public.mobile_billing_configs enable row level security;
alter table public.payment_connector_audit_logs enable row level security;

drop policy if exists "payment_connections: owner" on public.payment_provider_connections;
create policy "payment_connections: owner"
  on public.payment_provider_connections for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = payment_provider_connections.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = payment_provider_connections.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "payment_products: owner" on public.project_payment_products;
create policy "payment_products: owner"
  on public.project_payment_products for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_payment_products.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_payment_products.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "mobile_billing: owner" on public.mobile_billing_configs;
create policy "mobile_billing: owner"
  on public.mobile_billing_configs for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = mobile_billing_configs.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = mobile_billing_configs.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "payment_audit: owner read" on public.payment_connector_audit_logs;
create policy "payment_audit: owner read"
  on public.payment_connector_audit_logs for select
  using (user_id = auth.uid());

grant select, insert, update, delete on public.payment_provider_connections to authenticated;
grant select, insert, update, delete on public.project_payment_products to authenticated;
grant select, insert, update, delete on public.mobile_billing_configs to authenticated;
grant select on public.payment_connector_audit_logs to authenticated;

grant all on public.payment_provider_connections to service_role;
grant all on public.payment_webhook_events to service_role;
grant all on public.project_payment_products to service_role;
grant all on public.mobile_billing_configs to service_role;
grant all on public.payment_connector_audit_logs to service_role;

notify pgrst, 'reload schema';
