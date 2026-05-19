-- Expand contact_requests for public /contact page and admin workflow.

alter table public.contact_requests
  add column if not exists reason text,
  add column if not exists plan_interest text,
  add column if not exists status text not null default 'new',
  add column if not exists source text not null default 'contact_page',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Legacy rows: backfill reason from kind
update public.contact_requests
set
  reason = case
    when kind = 'sales' then 'Sales'
    when kind = 'support' then 'Support'
    else coalesce(reason, 'Other')
  end,
  source = coalesce(nullif(source, ''), 'legacy'),
  status = coalesce(nullif(status, ''), 'new')
where reason is null or reason = '';

-- kind remains for older API paths; new contact page sets both
alter table public.contact_requests alter column kind drop not null;

alter table public.contact_requests drop constraint if exists contact_requests_kind_check;
alter table public.contact_requests
  add constraint contact_requests_kind_check
  check (kind is null or kind in ('sales', 'support'));

alter table public.contact_requests drop constraint if exists contact_requests_status_check;
alter table public.contact_requests
  add constraint contact_requests_status_check
  check (status in ('new', 'read', 'resolved'));

create index if not exists contact_requests_status_idx
  on public.contact_requests (status, created_at desc);

create index if not exists contact_requests_reason_idx
  on public.contact_requests (reason, created_at desc);

-- Inserts only via service role API (no public select).
-- RLS stays enabled with no anon policies.

NOTIFY pgrst, 'reload schema';
