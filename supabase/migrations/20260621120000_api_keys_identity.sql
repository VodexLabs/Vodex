-- DreamOS86 API keys identity columns (idempotent)

alter table public.api_keys add column if not exists owner_id uuid references public.profiles (id) on delete cascade;
alter table public.api_keys add column if not exists workspace_id uuid references public.workspaces (id) on delete set null;
alter table public.api_keys add column if not exists status text default 'active';

update public.api_keys
set owner_id = user_id
where owner_id is null and user_id is not null;

update public.api_keys ak
set workspace_id = w.id
from (
  select distinct on (owner_id) owner_id, id
  from public.workspaces
  order by owner_id, created_at asc
) w
where ak.workspace_id is null
  and ak.owner_id = w.owner_id;

create index if not exists api_keys_workspace_id_idx on public.api_keys (workspace_id);
create index if not exists api_keys_owner_id_idx on public.api_keys (owner_id);
