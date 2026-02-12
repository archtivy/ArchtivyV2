-- Archtivy Matches Engine – DB schema
-- Run in Supabase SQL Editor. Requires: listings, listing_images, products, product_images.
-- Enable pgvector: In Supabase Dashboard > Database > Extensions, enable "vector"; or run:
--   create extension if not exists vector;

-- 1) image_ai – per-image embedding + structured attributes
-- image_id: listing_images.id when source='project'; product_images.id when source='product'.
-- listing_id + listing_type: for projects = listing_images.listing_id + 'project'; for products = null + 'product'.
create table if not exists public.image_ai (
  image_id uuid not null,
  source text not null check (source in ('project', 'product')),
  listing_id uuid null,
  listing_type text null check (listing_type in ('project', 'product')),
  embedding vector(1536),
  attrs jsonb not null default '{}',
  confidence int not null default 0 check (confidence >= 0 and confidence <= 100),
  updated_at timestamptz not null default now(),
  primary key (image_id, source)
);

comment on table public.image_ai is 'AI data per image: project = listing_images.id (listing_id=listing_images.listing_id); product = product_images.id (listing_id null)';
comment on column public.image_ai.image_id is 'listing_images.id when source=project; product_images.id when source=product';
comment on column public.image_ai.listing_id is 'Project listing id when source=project (listing_images.listing_id); null when source=product';
comment on column public.image_ai.listing_type is 'project or product; set for efficient project lookups';
comment on column public.image_ai.embedding is 'Normalized embedding vector (e.g. OpenAI 1536-dim)';
comment on column public.image_ai.attrs is 'Structured attributes: category, material, color, context';
comment on column public.image_ai.confidence is '0-100 confidence for attrs';

create index if not exists idx_image_ai_updated_at on public.image_ai (updated_at);
create index if not exists idx_image_ai_listing on public.image_ai (listing_id, listing_type) where listing_id is not null;

-- HNSW index for nearest-neighbor search (cosine distance) on product images only
create index if not exists idx_image_ai_embedding_hnsw on public.image_ai
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64)
  where listing_type = 'product' and embedding is not null;

-- 2) matches – project ↔ product match results (computed by matching engine)
-- project_id = listings.id where listings.type='project'; product_id = products.id
-- run_id: per-computation batch; safe delete only rows with different run_id after upsert
create table if not exists public.matches (
  project_id uuid not null,
  product_id uuid not null,
  run_id uuid not null,
  score int not null check (score >= 0 and score <= 100),
  tier text not null check (tier in ('verified', 'possible')),
  reasons jsonb not null default '[]',
  evidence_image_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (project_id, product_id)
);

comment on table public.matches is 'Computed project–product matches from image embeddings and attributes';
comment on column public.matches.tier is 'verified: high confidence; possible: lower confidence';
comment on column public.matches.reasons is 'Array of { type, score?, matches? } explaining the match';
comment on column public.matches.evidence_image_ids is 'Image IDs (project + product) that contributed to this match';

create index if not exists idx_matches_project_id on public.matches (project_id);
create index if not exists idx_matches_product_id on public.matches (product_id);
create index if not exists idx_matches_score on public.matches (score desc);
create index if not exists idx_matches_tier on public.matches (tier);
create index if not exists idx_matches_updated_at on public.matches (updated_at desc);

-- RLS: allow service role full access; public read-only for matches (optional)
alter table public.image_ai enable row level security;
alter table public.matches enable row level security;

create policy "image_ai_select" on public.image_ai for select using (true);
create policy "matches_select" on public.matches for select using (true);
-- Service role bypasses RLS; use service key for pipeline writes.

-- RPC: nearest-neighbor product images by embedding (uses HNSW index, cosine <=>)
-- query_embedding: JSON array of 1536 floats, passed as text and cast to vector
create or replace function public.match_product_images_by_embedding(
  query_embedding text,
  match_count int default 50
)
returns table (image_id uuid, product_id uuid, attrs jsonb, distance float)
language sql stable
as $$
  select ia.image_id, pi.product_id, ia.attrs, (ia.embedding <=> query_embedding::vector(1536)) as distance
  from public.image_ai ia
  join public.product_images pi on pi.id = ia.image_id
  where ia.source = 'product' and ia.embedding is not null
  order by ia.embedding <=> query_embedding::vector(1536)
  limit greatest(1, least(match_count, 500));
$$;

-- If matches table already existed without run_id, run once:
-- alter table public.matches add column run_id uuid;
-- update public.matches set run_id = gen_random_uuid() where run_id is null;
-- alter table public.matches alter column run_id set not null;
