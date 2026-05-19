-- Signup welcome wizard (modal) + chat attachment metadata
-- Idempotent.

alter table public.profiles
  add column if not exists signup_wizard_completed boolean not null default false;

alter table public.profiles
  add column if not exists signup_heard_about text;

alter table public.profiles
  add column if not exists signup_referral_code text;

-- Chat uploads bucket (service role + RLS on objects)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true,
  52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat-media: owner upload" on storage.objects;
create policy "chat-media: owner upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat-media: owner update" on storage.objects;
create policy "chat-media: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat-media: owner delete" on storage.objects;
create policy "chat-media: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat-media: public read" on storage.objects;
create policy "chat-media: public read"
  on storage.objects for select
  using (bucket_id = 'chat-media');

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  message_id uuid,
  bucket_id text not null default 'chat-media',
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0
);

create index if not exists message_attachments_user_idx
  on public.message_attachments (user_id, created_at desc);

create index if not exists message_attachments_conversation_idx
  on public.message_attachments (conversation_id);

alter table public.message_attachments enable row level security;

drop policy if exists "Users read own attachments" on public.message_attachments;
create policy "Users read own attachments"
  on public.message_attachments for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own attachments" on public.message_attachments;
create policy "Users insert own attachments"
  on public.message_attachments for insert
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
