-- Saved boards: public.folders and public.folder_items
-- Run in Supabase SQL Editor. Uses user_id text (Clerk user id). No auth.users dependency.
-- After running, reload PostgREST schema cache: Supabase Dashboard -> Settings -> API -> "Reload schema cache" or run a simple SELECT.

-- folders: user-owned named collections (user_id = Clerk user id)
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  cover_image_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_folders_user_id on public.folders (user_id);
create unique index if not exists idx_folders_user_lower_name on public.folders (user_id, lower(name));

-- folder_items: which projects/products are in which folder
create table if not exists public.folder_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  user_id text not null,
  entity_type text not null check (entity_type in ('project','product')),
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique (folder_id, entity_type, entity_id)
);

create index if not exists idx_folder_items_folder_id on public.folder_items (folder_id);
create index if not exists idx_folder_items_entity on public.folder_items (entity_type, entity_id);
create index if not exists idx_folder_items_user_id on public.folder_items (user_id);

-- Optional: RLS (service role bypasses; use if you ever use anon key with user context)
alter table public.folders enable row level security;
alter table public.folder_items enable row level security;

create policy "folders_select_own" on public.folders for select using (true);
create policy "folders_insert_own" on public.folders for insert with check (true);
create policy "folders_update_own" on public.folders for update using (true);
create policy "folders_delete_own" on public.folders for delete using (true);

create policy "folder_items_select" on public.folder_items for select using (true);
create policy "folder_items_insert" on public.folder_items for insert with check (true);
create policy "folder_items_delete" on public.folder_items for delete using (true);
