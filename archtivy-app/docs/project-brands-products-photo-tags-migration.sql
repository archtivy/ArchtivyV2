-- Project brands, product links source, photo product tags, and project metadata
-- Run in Supabase SQL Editor. Safe incremental (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Requires: listings, listing_images, project_product_links, profiles.

-- 1) project_brand_links: many-to-many project <-> brand (profile with role=brand)
create table if not exists public.project_brand_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.listings (id) on delete cascade,
  brand_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, brand_profile_id)
);

create index if not exists idx_project_brand_links_project on public.project_brand_links (project_id);
create index if not exists idx_project_brand_links_brand on public.project_brand_links (brand_profile_id);

comment on table public.project_brand_links is 'Brands featured in a project (replaces/supplements listings.brands_used for structured data)';

-- 2) project_product_links: source, created_at, unique, indexes
alter table public.project_product_links
  add column if not exists source text not null default 'manual'
  check (source in ('manual', 'photo_tag'));

alter table public.project_product_links
  add column if not exists created_at timestamptz not null default now();

-- Index for filtering by project and source (manual vs photo_tag)
create index if not exists idx_project_product_links_project_source
  on public.project_product_links (project_id, source);

comment on column public.project_product_links.source is 'manual: selected in brands/products UI; photo_tag: from photo-level tag';
comment on column public.project_product_links.created_at is 'When the link was created';

-- 3) photo_product_tags: tag a product at x/y on a listing image
create table if not exists public.photo_product_tags (
  id uuid primary key default gen_random_uuid(),
  listing_image_id uuid not null references public.listing_images (id) on delete cascade,
  product_id uuid not null references public.listings (id) on delete cascade,
  x numeric not null check (x >= 0 and x <= 1),
  y numeric not null check (y >= 0 and y <= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_photo_product_tags_listing_image on public.photo_product_tags (listing_image_id);
create index if not exists idx_photo_product_tags_product on public.photo_product_tags (product_id);

comment on table public.photo_product_tags is 'Product tag at normalized (0-1) x/y on a project gallery image; listing_image_id = photo/gallery image id';
comment on column public.photo_product_tags.listing_image_id is 'References listing_images.id (the photo in the project gallery)';
comment on column public.photo_product_tags.x is 'Normalized x (0-1) within image';
comment on column public.photo_product_tags.y is 'Normalized y (0-1) within image';
comment on column public.photo_product_tags.created_at is 'When the tag was created';

-- 4) listings: project metadata (build_status, collaboration_open, area_sqm)
alter table public.listings add column if not exists build_status text check (build_status in ('planned', 'ongoing', 'completed'));
alter table public.listings add column if not exists collaboration_open boolean not null default false;
alter table public.listings add column if not exists area_sqm numeric;

comment on column public.listings.build_status is 'Project build status: planned | ongoing | completed';
comment on column public.listings.collaboration_open is 'Whether project is open for collaboration';
comment on column public.listings.area_sqm is 'Area in square meters (computed or entered; area_sqft remains primary for US)';
