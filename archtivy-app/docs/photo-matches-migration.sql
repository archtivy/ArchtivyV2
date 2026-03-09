-- Photo-level product matches
-- Stores per-image AI-computed similarity scores with auto/manual selection
-- for lightbox sidebar display. Unlike the project-level `matches` table,
-- this stores one row per (project_image, product) pair.

create table if not exists public.photo_matches (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references listing_images(id) on delete cascade,
  product_id uuid not null references listings(id) on delete cascade,
  score numeric not null default 0,
  embedding_score numeric,
  attribute_score numeric,
  shared_keyword_count int not null default 0,
  -- Selection fields
  is_selected boolean not null default false,
  selected_mode text check (selected_mode in ('manual', 'auto', 'keyword')),
  selected_score numeric,
  selected_at timestamptz,
  -- Tracking
  run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One match per image-product pair
  unique(photo_id, product_id)
);

-- Fast lightbox query: selected matches for an image
create index if not exists idx_photo_matches_photo_selected
  on photo_matches(photo_id) where is_selected = true;

-- Engine cleanup by run
create index if not exists idx_photo_matches_run_id
  on photo_matches(run_id);

-- Find all photo matches for a project's images (via listing_images.listing_id)
create index if not exists idx_photo_matches_photo_id
  on photo_matches(photo_id);
