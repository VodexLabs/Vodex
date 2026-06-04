-- P3.6 — document plan_upgrade_delta in token_ledger metadata (no schema change required)

comment on column public.token_ledger.source is
  'Includes plan_upgrade_delta for mid-cycle allowance top-ups on upgrade.';

notify pgrst, 'reload schema';
