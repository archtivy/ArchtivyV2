-- Archtivy Gallery V1 – projects, products, images, connections, bookmarks
-- Run in Supabase SQL Editor. Requires auth.users (Supabase Auth).

-- 1) projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

create index if not exists idx_projects_slug on public.projects (slug);

-- 2) project_images
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  src text not null,
  alt text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_project_images_project_id on public.project_images (project_id);

-- 3) products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  created_at timestamptz default now()
);

create index if not exists idx_products_slug on public.products (slug);

-- 4) product_images
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  src text not null,
  alt text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_product_images_product_id on public.product_images (product_id);

-- 5) connections (project <-> product many-to-many)
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  from_type text not null check (from_type in ('project','product')),
  from_id uuid not null,
  to_type text not null check (to_type in ('project','product')),
  to_id uuid not null,
  source text default 'manual',
  created_at timestamptz default now()
);

create index if not exists idx_connections_from on public.connections (from_type, from_id);
create index if not exists idx_connections_to on public.connections (to_type, to_id);

-- 6) bookmarks (Supabase Auth user_id)
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('project','product')),
  entity_id uuid not null,
  created_at timestamptz default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists idx_bookmarks_user_entity on public.bookmarks (user_id, entity_type, entity_id);

-- RLS
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.connections enable row level security;
alter table public.bookmarks enable row level security;

-- Public read: projects, products, images, connections
create policy "projects_select" on public.projects for select using (true);
create policy "project_images_select" on public.project_images for select using (true);
create policy "products_select" on public.products for select using (true);
create policy "product_images_select" on public.product_images for select using (true);
create policy "connections_select" on public.connections for select using (true);

-- Bookmarks: own rows only
create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);
