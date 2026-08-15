-- ============================================================================
-- Inspiration System — schema for the v1 scope in spec §9.6
-- Review copy. NOT APPLIED. Promote to migrations/ once approved.
--
-- Contents:
--   1. listing_images.shot_type          (phase-2 column, added now per instruction)
--   2. collections + collection_items    (AI Collections, §5/§9.5)
--   3. color-family facet applies_to     (extended to project)
--   4. match_listing_images_by_embedding (NEW — see the DELTA note below)
--
-- ── DELTA FROM THE SPEC — please read ───────────────────────────────────────
-- Instruction 3 says to build "Similar Inspirations" on the existing
-- `match_product_images_by_embedding` RPC. That RPC cannot serve the whole
-- feed: it is hard-scoped to product images and its return signature is
-- (image_id, PRODUCT_ID, attrs, distance). There is no project_id in it, so a
-- project card cannot get similar projects from it, and 50 of the ~126 feed
-- items are projects.
--
-- Adding a generalised sibling below rather than descoping the feature to
-- product cards only. It reuses the SAME embedding column and the SAME HNSW
-- index — no new infrastructure, no reindex, and the existing product RPC is
-- left untouched so nothing currently calling it changes behaviour.
-- ============================================================================

begin;

-- ── 1. listing_images.shot_type ─────────────────────────────────────────────
-- Nullable with no default: NULL means "not yet classified", which is the
-- honest state for all 1,159 existing rows. Deliberately NOT defaulted to
-- 'exterior' or similar — a wrong default is indistinguishable from real data
-- once written, and the Interiors/Exteriors tabs are phase 2 precisely because
-- this column has no trustworthy values yet.
alter table public.listing_images
  add column if not exists shot_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listing_images_shot_type_check'
  ) then
    alter table public.listing_images
      add constraint listing_images_shot_type_check
      check (shot_type is null or shot_type in ('interior','exterior','detail','site','drawing'));
  end if;
end $$;

-- Classification provenance. Per the Database Bible's AI Integration rule, an
-- AI-assisted backfill must be reviewable before it is treated as authoritative,
-- so the source and the review state travel with the value itself rather than
-- living in a job log nobody reads.
alter table public.listing_images
  add column if not exists shot_type_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listing_images_shot_type_source_check'
  ) then
    alter table public.listing_images
      add constraint listing_images_shot_type_source_check
      check (shot_type_source is null or shot_type_source in ('ai_unreviewed','ai_confirmed','human'));
  end if;
end $$;

create index if not exists listing_images_shot_type_idx
  on public.listing_images (shot_type) where shot_type is not null;

-- ── 2. collections ──────────────────────────────────────────────────────────
-- A Collection is a SAVED TAXONOMY QUERY plus authored editorial framing.
-- Membership is materialised daily into collection_items (§5: never computed
-- per-request).
--
-- NOTE ON "AI": nothing in this schema generates collections. `title`,
-- `description` and `taxonomy_filter_definition` are authored, because the SEO
-- Bible requires genuinely distinct per-collection prose and there is no
-- generation model in the v1 scope. The daily job only recomputes MEMBERSHIP.
-- See the note reported alongside this migration.
create table if not exists public.collections (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text not null unique,
  title                     text not null,
  -- Required, and enforced long enough that a one-line templated sentence
  -- cannot satisfy it. The SEO Bible's Scaled Content Abuse risk is a
  -- domain-level risk, so the guard belongs in the schema, not in a linter.
  description               text not null check (char_length(btrim(description)) >= 120),

  -- The query that defines membership. Shape is documented in
  -- lib/db/collections.ts and validated in the service layer before write.
  taxonomy_filter_definition jsonb not null default '{}'::jsonb,

  item_count                integer not null default 0 check (item_count >= 0),
  last_generated_at         timestamptz,

  -- Indexation gate (SEO Bible). `is_indexable` is DERIVED by the daily job
  -- from item_count vs. the threshold; it is not hand-set, so a collection that
  -- decays below the bar de-indexes itself without anyone remembering to.
  is_indexable              boolean not null default false,
  is_published              boolean not null default false,

  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

create index if not exists collections_published_idx
  on public.collections (is_published, sort_order)
  where deleted_at is null;

-- Materialised membership. Rebuilt wholesale by the daily job, so it carries no
-- state of its own that a rebuild could destroy.
create table if not exists public.collection_items (
  collection_id uuid not null references public.collections(id) on delete cascade,
  listing_id    uuid not null references public.listings(id) on delete cascade,
  sort_order    integer not null default 0,
  generated_at  timestamptz not null default now(),
  primary key (collection_id, listing_id)
);

create index if not exists collection_items_listing_idx
  on public.collection_items (listing_id);

create or replace function public.collections_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists collections_touch_updated_at on public.collections;
create trigger collections_touch_updated_at
  before update on public.collections
  for each row execute function public.collections_touch_updated_at();

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "Public can read published collections" on public.collections;
create policy "Public can read published collections"
  on public.collections for select
  using (is_published = true and deleted_at is null);

drop policy if exists "Public can read items of published collections" on public.collection_items;
create policy "Public can read items of published collections"
  on public.collection_items for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.is_published = true and c.deleted_at is null
    )
  );

-- ── 3. color-family facet: extend applies_to ────────────────────────────────
-- Was ["product"], so the Colors filter could never match a project. Additive:
-- existing product behaviour is unchanged.
update public.facets
   set applies_to = array(select distinct unnest(applies_to || array['project']))
 where slug = 'color-family'
   and not ('project' = any(applies_to));

-- ── 4. Generalised image-similarity RPC (see DELTA note at the top) ─────────
-- Same embedding column, same HNSW index, same cosine operator as the existing
-- product-only function. Adds a listing_type filter and returns listing_id, so
-- a project card can find similar projects.
--
-- SECURITY: `stable` + explicit search_path. Callers pass a vector literal
-- built by toVectorLiteral() in lib/db/imageAi.ts — reused, not re-implemented.
--
-- ── search_path INCLUDES `extensions` DELIBERATELY ──────────────────────────
-- Supabase installs pgvector into the `extensions` schema, not `public`. Two
-- things here depend on resolving it:
--   * the `vector(1536)` parameter type, resolved against the SESSION
--     search_path when this CREATE runs;
--   * the `<=>` cosine operator, resolved against the FUNCTION search_path
--     every time the body executes.
-- Pinned to `public` alone, the second would fail at call time with
-- "operator does not exist: vector <=> vector" — after the migration had
-- already reported success. Including `extensions` is harmless if pgvector
-- happens to live in public.
--
-- VERIFY BEFORE APPLYING (one query, tells you if even this is enough):
--   select extnamespace::regnamespace as schema from pg_extension
--    where extname = 'vector';
-- If it returns something other than `public` or `extensions`, add that schema
-- to both the SET below and the session search_path used to run this file.
create or replace function public.match_listing_images_by_embedding(
  query_embedding vector(1536),
  match_count integer default 12,
  filter_listing_type text default null,
  exclude_listing_id uuid default null
)
returns table (
  image_id uuid,
  listing_id uuid,
  listing_type text,
  distance double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    ia.image_id,
    ia.listing_id,
    ia.listing_type,
    (ia.embedding <=> query_embedding)::double precision as distance
  from public.image_ai ia
  where ia.embedding is not null
    and ia.listing_id is not null
    and (filter_listing_type is null or ia.listing_type = filter_listing_type)
    and (exclude_listing_id is null or ia.listing_id <> exclude_listing_id)
  order by ia.embedding <=> query_embedding
  limit greatest(1, least(200, match_count));
$$;

commit;

-- ── Verification ────────────────────────────────────────────────────────────
--   select count(*) from public.collections;                      -- 0
--   select count(*) from public.collection_items;                 -- 0
--   select applies_to from public.facets where slug='color-family';
--        -- expect {product,project}
--   select count(*) from public.listing_images where shot_type is null;
--        -- expect 1159 (all unclassified, as intended)
--   select * from public.match_listing_images_by_embedding(
--            (select embedding from public.image_ai limit 1), 5, 'project');
--        -- expect 5 rows ordered by distance
