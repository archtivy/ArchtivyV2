-- ============================================================================
-- Magazine: articles + related-entity join
-- Review copy. NOT APPLIED. Promote to migrations/ once approved.
--
-- Decisions this encodes (confirmed 2026-08-06):
--   1. Own `articles` table, not a row in `listings`. `listings` is not a
--      generic entity table — 51 columns, most of them project- or
--      product-specific, and `type` is assumed to be project|product across
--      dozens of call sites (getPlatformTotals, sitemap, explore, and all four
--      directory pages). An article row there would carry 40+ permanent NULLs.
--      This table follows listings' CONVENTIONS instead: slug, status,
--      owner-by-profile, soft delete, created/updated timestamps.
--   2. All articles reviewed. status starts at 'draft' and only a moderator
--      moves it to 'published' — deliberately stricter than projects/products,
--      which insert straight to APPROVED today. Logged in DATA_INTEGRITY_LOG.md.
--   3. Body is markdown TEXT, never HTML. Rendered server-side through an
--      allow-list. Nothing in this schema can hold a script tag meaningfully.
--
-- DEVIATION FROM THE TECHNICAL SPEC — related entities.
-- The spec asks for (entityType, entityId), a polymorphic pair. That cannot
-- carry a foreign key, and this codebase has already been bitten by exactly
-- that: project_material_links has no FKs, so a PostgREST embed returned rows
-- with no embedded object AND NO ERROR, silently emptying the Materials filter
-- (DATA_INTEGRITY_LOG.md item 1).
-- Instead: two nullable FK columns with a XOR check. Every related entity in
-- the brief is either a listing (project, product) or a profile (professional,
-- brand), so two columns cover all four types with real referential integrity,
-- real cascade, and working embeds.
-- ============================================================================

begin;

-- ── articles ────────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique,
  title                  text not null,
  dek                    text,
  body_md                text not null default '',
  cover_image_url        text,

  -- Typed relationships, not free text (Database Bible §Relationship-First).
  --
  -- NULLABLE + SET NULL, deliberately. Deleting a profile must not cascade away
  -- their published, SEO-indexed articles: the URL is public, indexed and linked,
  -- and losing it turns a live page into a 404 rather than an orphaned byline.
  -- Matches the asymmetry already used for reviewed_by_profile_id below.
  -- An article with a null author renders unattributed rather than disappearing,
  -- and the ownership checks in app/actions/articles.ts fail closed against null.
  author_profile_id      uuid references public.profiles(id) on delete set null,
  topic_node_id          uuid references public.taxonomy_nodes(id) on delete set null,

  status                 text not null default 'draft'
                           check (status in ('draft','pending_review','published','rejected','archived')),
  review_note            text,
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at            timestamptz,

  published_at           timestamptz,
  -- Derived from body_md on every write, never hand-edited. Reproducible from
  -- the canonical record, per the Database Bible's derived-data rule.
  read_time_minutes      integer not null default 1 check (read_time_minutes > 0),
  is_featured            boolean not null default false,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,

  -- A published article must have a slug and a publish date; a draft need not.
  constraint articles_published_shape check (
    status <> 'published' or (slug is not null and published_at is not null)
  )
);

create index if not exists articles_status_published_idx
  on public.articles (status, published_at desc)
  where deleted_at is null;
create index if not exists articles_author_idx on public.articles (author_profile_id);
create index if not exists articles_topic_idx on public.articles (topic_node_id);
create index if not exists articles_featured_idx
  on public.articles (is_featured, published_at desc)
  where status = 'published' and deleted_at is null;

-- ── article_related_entities ────────────────────────────────────────────────
create table if not exists public.article_related_entities (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  listing_id  uuid references public.listings(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  -- Exactly one target. This is what makes the FKs possible at all.
  constraint article_related_one_target check (
    (listing_id is not null) <> (profile_id is not null)
  )
);

create unique index if not exists article_related_listing_uniq
  on public.article_related_entities (article_id, listing_id)
  where listing_id is not null;
create unique index if not exists article_related_profile_uniq
  on public.article_related_entities (article_id, profile_id)
  where profile_id is not null;
create index if not exists article_related_listing_reverse_idx
  on public.article_related_entities (listing_id) where listing_id is not null;
create index if not exists article_related_profile_reverse_idx
  on public.article_related_entities (profile_id) where profile_id is not null;

-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function public.articles_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at
  before update on public.articles
  for each row execute function public.articles_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- The app reads through the service-role client, which bypasses RLS. These
-- policies exist so that a published article is the ONLY thing an anon key can
-- ever see — drafts and pending review are not public by accident.
alter table public.articles enable row level security;
alter table public.article_related_entities enable row level security;

drop policy if exists "Public can read published articles" on public.articles;
create policy "Public can read published articles"
  on public.articles for select
  using (status = 'published' and deleted_at is null);

drop policy if exists "Public can read related entities of published articles"
  on public.article_related_entities;
create policy "Public can read related entities of published articles"
  on public.article_related_entities for select
  using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published' and a.deleted_at is null
    )
  );

commit;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expected after apply: both tables exist, 0 rows, RLS enabled on both.
--   select count(*) from public.articles;                  -- 0
--   select count(*) from public.article_related_entities;  -- 0
--   select relname, relrowsecurity from pg_class
--    where relname in ('articles','article_related_entities');  -- both true
