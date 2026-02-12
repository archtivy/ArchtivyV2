-- Archtivy MVP schema
-- Run in Supabase SQL Editor after creating a project

-- Profiles (synced from Clerk; role determines capabilities)
create type profile_role as enum ('designer', 'brand', 'visitor');

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  username text,
  display_name text,
  role profile_role not null default 'visitor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles (user_id);
create index if not exists idx_profiles_username on public.profiles (username);

-- Listings: projects or products
create type listing_type as enum ('project', 'product');

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  type listing_type not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listings_type on public.listings (type);
create index if not exists idx_listings_created_at on public.listings (created_at desc);

-- Gallery images per listing
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  image_url text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_images_listing_id on public.listing_images (listing_id);

-- Project <-> Product links (many-to-many)
create table if not exists public.project_product_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.listings (id) on delete cascade,
  product_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, product_id)
);

create index if not exists idx_ppl_project on public.project_product_links (project_id);
create index if not exists idx_ppl_product on public.project_product_links (product_id);

-- RLS (optional; enable when you enforce auth)
-- alter table public.profiles enable row level security;
-- alter table public.listings enable row level security;
-- alter table public.listing_images enable row level security;
-- alter table public.project_product_links enable row level security;

-- For MVP: allow anon read/write so app works without auth (secure later)
-- In Supabase Dashboard: Authentication > Policies, or add policies here when ready.
