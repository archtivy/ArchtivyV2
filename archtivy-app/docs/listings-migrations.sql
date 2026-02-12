-- Listings: Add Project / Add Product fields and documents
-- Run in Supabase SQL Editor. Safe to run incrementally (ADD COLUMN IF NOT EXISTS).

-- 1) Listings table: add columns for projects and products
alter table public.listings add column if not exists cover_image_url text;
alter table public.listings add column if not exists location text;
alter table public.listings add column if not exists category text;
alter table public.listings add column if not exists area_sqft numeric;
alter table public.listings add column if not exists year text;
alter table public.listings add column if not exists product_type text;
alter table public.listings add column if not exists feature_highlight text;
alter table public.listings add column if not exists material_or_finish text;
alter table public.listings add column if not exists dimensions text;
alter table public.listings add column if not exists team_members jsonb default '[]';
alter table public.listings add column if not exists brands_used jsonb default '[]';

comment on column public.listings.cover_image_url is 'URL of cover image (first/feature image)';
comment on column public.listings.location is 'Project location or general location';
comment on column public.listings.category is 'Project category (project only)';
comment on column public.listings.area_sqft is 'Area in sqft (project only)';
comment on column public.listings.year is 'Year completed or product year';
comment on column public.listings.product_type is 'Product type (product only)';
comment on column public.listings.feature_highlight is 'One key feature (product optional)';
comment on column public.listings.material_or_finish is 'Material or finish (product optional)';
comment on column public.listings.dimensions is 'Dimensions (product optional)';
comment on column public.listings.team_members is 'Array of { name, role }';
comment on column public.listings.brands_used is 'Array of { name, logo_url? } for brands';

-- 2) Listing documents (PDF, DOCX, PPTX, ZIP) – shown on detail page only
create table if not exists public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_documents_listing_id on public.listing_documents (listing_id);
