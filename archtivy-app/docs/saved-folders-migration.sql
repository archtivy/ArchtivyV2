-- Saved folders and folder_items (many-to-many: user folders <-> saved projects/products)
-- Run after gallery-migrations.sql. Uses auth.users (Supabase Auth).

-- folders: user-owned named collections
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_folders_user on public.folders (user_id);

-- folder_items: which projects/products are in which folder (one entity can be in many folders)
create table if not exists public.folder_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  entity_type text not null check (entity_type in ('project','product')),
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique (folder_id, entity_type, entity_id)
);

create index if not exists idx_folder_items_folder on public.folder_items (folder_id);
create index if not exists idx_folder_items_entity on public.folder_items (entity_type, entity_id);

-- RLS
alter table public.folders enable row level security;
alter table public.folder_items enable row level security;

create policy "folders_select" on public.folders for select using (auth.uid() = user_id);
create policy "folders_insert" on public.folders for insert with check (auth.uid() = user_id);
create policy "folders_update" on public.folders for update using (auth.uid() = user_id);
create policy "folders_delete" on public.folders for delete using (auth.uid() = user_id);

create policy "folder_items_select" on public.folder_items for select using (
  exists (select 1 from public.folders where folders.id = folder_items.folder_id and folders.user_id = auth.uid())
);
create policy "folder_items_insert" on public.folder_items for insert with check (
  exists (select 1 from public.folders where folders.id = folder_items.folder_id and folders.user_id = auth.uid())
);
create policy "folder_items_delete" on public.folder_items for delete using (
  exists (select 1 from public.folders where folders.id = folder_items.folder_id and folders.user_id = auth.uid())
);
