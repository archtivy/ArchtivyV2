-- Image regions: AI-detected product-like objects in listing images
-- Each row represents a detected object with position, classification, and optional product match.

create table if not exists image_regions (
  id uuid primary key default gen_random_uuid(),
  listing_image_id uuid not null references listing_images(id) on delete cascade,
  region_index smallint not null default 0,

  -- Detection
  label text not null,                      -- e.g. "sofa", "pendant light"
  object_type text not null,                -- normalized: seating, lighting, table, bed, sink, faucet, rug, shelving
  keywords jsonb not null default '[]',     -- e.g. ["curved", "beige upholstery", "low profile"]
  confidence real not null default 0,       -- 0.0–1.0

  -- Position (percentage-based, 0–100)
  x real not null,                          -- center x as % of image width
  y real not null,                          -- center y as % of image height
  width real,                               -- bounding box width as % (nullable for V1 point markers)
  height real,                              -- bounding box height as % (nullable for V1 point markers)

  -- Product matching
  matched_listing_id uuid references listings(id) on delete set null,
  match_score real,                         -- 0.0–1.0, null if no match attempted
  match_candidates jsonb default '[]',      -- [{ listing_id, score, title, slug, cover }]
  selected_mode text not null default 'none' check (selected_mode in ('matched', 'similar', 'none')),

  -- Scene context (stored once per image, on the first region row)
  scene_summary text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookup by image
create index idx_image_regions_image on image_regions (listing_image_id, region_index);

-- Find all regions for a listing (join through listing_images)
create index idx_image_regions_confidence on image_regions (confidence desc) where confidence >= 0.7;

-- RLS: public read (regions are shown on public detail pages), writes via service_role
alter table image_regions enable row level security;

create policy "Public can read image regions"
  on image_regions for select
  using (true);
