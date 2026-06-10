-- P1.3.34 — group delete email verification (sanctions table already exists from 20260904120000)

alter table public.groups
  add column if not exists delete_requested_at timestamptz,
  add column if not exists delete_verified_at timestamptz,
  add column if not exists delete_verification_token text;

create index if not exists groups_delete_verification_token_idx
  on public.groups (delete_verification_token)
  where delete_verification_token is not null;

notify pgrst, 'reload schema';
