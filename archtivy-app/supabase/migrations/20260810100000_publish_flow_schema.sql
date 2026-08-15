-- ============================================================================
-- Publish flow schema — three locked decisions in one transaction
--   1. listings.status gains 'DRAFT'
--   2. listings gains meta_description, website, instagram, video_url
--   3. photo_product_tags (7 rows) consolidated into product_tags
--
-- Review copy. NOT APPLIED.
--
-- ── MANDATORY COMPANION CODE CHANGE (ships in the same PR) ──────────────────
-- authCheckPending() in BOTH /projects/[...segments] and /products/[...segments]
-- currently tests `status !== "PENDING"` and returns early for anything else.
-- A DRAFT row would therefore fall straight through and render publicly. Both
-- guards are widened to PENDING|DRAFT, and both generateMetadata early-returns
-- with them. Audited: /listing/[id] filters APPROVED, neither detail route uses
-- generateStaticParams, and every directory/sitemap/explore/inspiration query
-- filters status='APPROVED' explicitly. Those two guards are the whole exposure.
-- ============================================================================


-- ── 1. status vocabulary ────────────────────────────────────────────────────
-- The existing CHECK allows exactly APPROVED and PENDING — established by
-- probing every plausible value (REJECTED, ARCHIVED, HIDDEN, DELETED,
-- PUBLISHED, REVIEW are all rejected today). So this is a drop-and-recreate,
-- not an addition, and the new vocabulary must restate the old one.
--
-- The constraint is found by DEFINITION rather than by name: the error text
-- that revealed it was truncated ("listings_st…"), and dropping a guessed name
-- would either fail or, worse, silently drop nothing if written as IF EXISTS.
do $$
declare
  v_name text;
begin
  select conname into v_name
    from pg_constraint
   where conrelid = 'public.listings'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%'
     and pg_get_constraintdef(oid) like '%APPROVED%'
   limit 1;

  if v_name is null then
    raise exception 'No status CHECK found on public.listings — schema differs from the audit; stopping rather than guessing.';
  end if;

  execute format('alter table public.listings drop constraint %I', v_name);
  raise notice 'dropped status constraint %', v_name;
end $$;

alter table public.listings
  add constraint listings_status_check
  check (status in ('APPROVED', 'PENDING', 'DRAFT'));

-- Every existing row already satisfies this (163 APPROVED, 1 PENDING), so no
-- backfill and no NOT VALID dance is needed.

-- ── 2. publish-flow columns ─────────────────────────────────────────────────
-- All nullable. NOT NULL is impossible without fabricating values for 164
-- existing rows, and "required before publish" is a TRANSITION rule
-- (DRAFT -> APPROVED), not a column property — the column cannot know whether
-- a row is mid-draft. Enforced in the publish action and surfaced by the SEO
-- Score panel.
alter table public.listings
  add column if not exists meta_description text,
  add column if not exists website          text,
  add column if not exists instagram        text,
  add column if not exists video_url        text;

-- meta_description: length is bounded but not required. 160 is the practical
-- SERP truncation point; the SEO panel's 120-160 guidance lives in the UI,
-- while the schema only stops something absurd being stored.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_meta_description_len') then
    alter table public.listings
      add constraint listings_meta_description_len
      check (meta_description is null or char_length(meta_description) <= 320);
  end if;
end $$;

-- instagram: NORMALISED BARE HANDLE — lowercase, no '@', no URL.
-- Deliberately NOT the profiles convention, which stores a mix of
-- 'https://www.instagram.com/molteniandc' and '@joenski15' and therefore forces
-- every render site to guess. The display URL is derived at render.
-- Instagram handles are 1-30 chars of a-z 0-9 . and _.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_instagram_handle') then
    alter table public.listings
      add constraint listings_instagram_handle
      check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$');
  end if;
end $$;

comment on column public.listings.instagram is
  'Normalised bare handle: lowercase, no @, no URL. Display URL derived at render.';
comment on column public.listings.meta_description is
  'Authored SEO description. Required at publish (DRAFT->APPROVED), not at column level.';

-- NOTE: no is_indexable column, deliberately.
-- The Collections pattern stores is_indexable because a nightly job derives it
-- from materialised membership. Listings have no such job: the SEO score is a
-- pure function of fields already on the row, so a stored copy could only ever
-- go stale relative to its own inputs — every edit outside the wizard would
-- silently invalidate it. Derived at render instead. Intentional deviation from
-- the Collections architecture, not an oversight.

-- ── 3. pin consolidation ────────────────────────────────────────────────────
-- photo_product_tags -> product_tags.
--   x,y are 0-1 FRACTIONS; product_tags stores 0-100 PERCENTAGES. Hence *100.
--   Verified against all 7 rows: every target is an APPROVED type='product'
--   listing, every image exists, no duplicate (image, product) pair, all
--   coordinates inside 0-1. The product_tags trigger would reject any row that
--   were not, so a bad row fails the migration rather than landing silently.
--
-- STATUS SPLIT, by position rather than by id so it self-corrects if the source
-- changes before this runs:
--   x=0.5 AND y=0.5  -> 'unverified'. Dead centre is what
--                       createPhotoProductTagPlaceholder() writes; nobody
--                       pointed at anything. Publishing these as confirmed
--                       would put an authoritative pin in the middle of six
--                       photos on the strength of a default. They surface in
--                       the owner's confirm/reject queue instead.
--   anything else    -> 'verified'. Someone dragged it there. Admin-authored,
--                       so 'verified' (a moderator confirmed) rather than
--                       'official' (the brand/owner stated it).
-- Current split: 6 placeholder, 1 positioned.
--
-- created_by is NULL: photo_product_tags has no actor column, so there is no
-- author to carry across and inventing one would be worse than admitting it.
do $$
declare
  v_src   integer;
  v_moved integer;
begin
  select count(*) into v_src from public.photo_product_tags where product_id is not null;

  insert into public.product_tags (
    listing_image_id, listing_id, tagged_listing_id,
    x_percent, y_percent, tag_source, verification_status, created_by, created_at
  )
  select
    t.listing_image_id,
    li.listing_id,                    -- the trigger re-derives this anyway
    t.product_id,
    round((t.x * 100)::numeric, 2),
    round((t.y * 100)::numeric, 2),
    'owner',                          -- human-placed, not machine-suggested
    case when t.x = 0.5 and t.y = 0.5
         then 'unverified'::public.verification_status
         else 'verified'::public.verification_status
    end,
    null,
    t.created_at                      -- preserve original authorship time
  from public.photo_product_tags t
  join public.listing_images li on li.id = t.listing_image_id
  join public.listings p on p.id = t.product_id and p.type = 'product'
  where t.product_id is not null
  on conflict (listing_image_id, tagged_listing_id) do nothing;

  get diagnostics v_moved = row_count;

  if v_moved <> v_src then
    raise exception 'Pin migration moved % of % rows — expected all. Aborting.', v_moved, v_src;
  end if;

  raise notice 'migrated % pins', v_moved;
end $$;

-- Provenance for every migrated pin, so the audit trail does not start with an
-- unexplained row. actor_kind 'human' because these were admin-authored; the
-- actor id itself is genuinely unknown and stays null.
insert into public.product_tag_audit_log (product_tag_id, action, to_status, actor_profile_id, actor_kind, metadata)
select
  pt.id,
  'created',
  pt.verification_status,
  null,
  'human',
  jsonb_build_object(
    'migrated_from', 'photo_product_tags',
    'original_x', t.x,
    'original_y', t.y,
    'migration', '20260810_publish_flow_schema'
  )
from public.product_tags pt
join public.listing_images li on li.id = pt.listing_image_id
join public.photo_product_tags t
  on t.listing_image_id = pt.listing_image_id
 and t.product_id = pt.tagged_listing_id;

-- photo_product_tags is deliberately LEFT IN PLACE. Dropping it in the same
-- migration that moves its data removes the rollback path before anyone has
-- confirmed the new pins render. It is retired in a follow-up migration once
-- verified, together with lib/db/photoProductTags.ts, ImageProductTagSidebar
-- and the related server actions.


-- ── Verification ────────────────────────────────────────────────────────────
--   -- status vocabulary
--   insert into listings (type, listing_type, title, status)
--        values ('project','project','__probe__','DRAFT');   -- expect success
--   delete from listings where title = '__probe__';
--   insert into listings (type, listing_type, title, status)
--        values ('project','project','__probe__','NONSENSE'); -- expect 23514
--
--   -- columns
--   update listings set instagram = 'Molteni&C' where id = (select id from listings limit 1);
--        -- expect 23514: not a normalised handle
--
--   -- pins
--   select verification_status, count(*) from product_tags group by 1;
--        -- expect unverified 6, verified 1
--   select count(*) from product_tag_audit_log
--    where metadata->>'migrated_from' = 'photo_product_tags';   -- expect 7
--   select count(*) from photo_product_tags;                    -- expect 7, untouched
