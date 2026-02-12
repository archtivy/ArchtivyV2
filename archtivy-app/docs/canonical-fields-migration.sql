-- Canonical fields for listings (projects) and products
-- Run in Supabase SQL Editor. Safe to run incrementally (ADD COLUMN IF NOT EXISTS).

-- Listings: location (Mapbox), area_sqm, slug for canonical project URLs
alter table public.listings add column if not exists slug text unique;
alter table public.listings add column if not exists location_place_id text;
alter table public.listings add column if not exists location_city text;
alter table public.listings add column if not exists location_country text;
alter table public.listings add column if not exists location_country_code text;
alter table public.listings add column if not exists location_lat double precision;
alter table public.listings add column if not exists location_lng double precision;
alter table public.listings add column if not exists location_text text;
alter table public.listings add column if not exists area_sqm numeric;
alter table public.listings add column if not exists project_category text;

create index if not exists idx_listings_slug on public.listings (slug) where slug is not null;

-- Products: canonical fields (description, category, material_type, color, year, brand_profile_id, cover_image_url)
alter table public.products add column if not exists description text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists material_type text;
alter table public.products add column if not exists color text;
alter table public.products add column if not exists year int;
alter table public.products add column if not exists brand_profile_id uuid references public.profiles(id);
alter table public.products add column if not exists cover_image_url text;
alter table public.products add column if not exists used_in_projects int default 0;
alter table public.products add column if not exists team_members jsonb default '[]';
alter table public.products add column if not exists documents jsonb default '[]';

create index if not exists idx_products_brand_profile_id on public.products (brand_profile_id);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_material_type on public.products (material_type);
create index if not exists idx_products_year on public.products (year);
