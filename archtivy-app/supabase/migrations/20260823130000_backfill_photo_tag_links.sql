-- Backfill the project_product_links rows that product_tags never wrote.
--
-- ── WHAT WENT WRONG ─────────────────────────────────────────────────────────
-- Two tagging paths existed. The legacy one (photo_product_tags via
-- addPhotoProductTag) upserted a project_product_links row with
-- source='photo_tag'. The canonical one (app/actions/productTags.ts, which the
-- self-serve PinEditor posts to) never did. So a pin placed in the owner's own
-- management page drew a hotspot on the photo and created no relationship —
-- and project_product_links is what Explore, the network graph, the connection
-- counts and both detail pages' "used in" rails actually read.
--
-- The code side is fixed in the same PR: lib/db/productTagLinks.ts now
-- reconciles the edge after every create, delete and review. This repairs the
-- rows written before that existed.
--
-- ── MEASURED AGAINST PRODUCTION BEFORE WRITING ──────────────────────────────
-- 10 product_tags rows exist. 8 already have their edge — the 7 oldest because
-- they were mirrored from the legacy table, which maintained it, plus one whose
-- product the author had also listed by hand. Exactly 2 are missing, both
-- created 2026-08-23 through PinEditor:
--
--   tag 0767e306-262a-43b3-ba6f-81d8cb7d19d0
--     project 0698809b-8c04-45e2-8f54-28b3b04e64c0  (istanbul-house-2)
--     product 31ddc4db-2ee2-43b0-b412-3e35d90dccb7  (aeris-104-led-glass-pendant-lamp)
--
--   tag 5c696c3f-bf2f-4f8f-b495-9c0ea3053aba
--     project 0698809b-8c04-45e2-8f54-28b3b04e64c0  (istanbul-house-2)
--     product 55c093df-2a35-46c4-81e0-7ba2f2f80635  (all-glass-stairs)
--
-- All three listings are APPROVED, correctly typed and not deleted.
--
-- ── WHY THIS IS NOT WRITTEN AS TWO LITERAL INSERTS ──────────────────────────
-- The statement below is the invariant the application now enforces, expressed
-- once: an edge exists where a PUBLIC tag links a project to a product. Run
-- today it matches exactly the two rows named above. Hardcoding those two ids
-- would silently miss a third if one were created between review and apply,
-- and would not be re-runnable. The guard block asserts the count is what was
-- measured, so a surprise stops the migration instead of being written blind.
--
-- ── ONLY PUBLIC TAGS COUNT ──────────────────────────────────────────────────
-- verification_status in ('verified','official') — the same set the public
-- hotspot read uses. An `unverified` AI suggestion is hidden on the page, and
-- must not create a visible "used in this project" claim on its behalf. Both
-- rows being repaired are 'official' (owner-placed).
--
-- ── source='photo_tag', AND manual IS NEVER TOUCHED ─────────────────────────
-- The NOT EXISTS guard skips any pair that already has a row, so a 'manual'
-- link keeps its source and its meaning: the author listed that product by
-- hand, which outranks anything inferred from a pin.
--
-- ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
-- It inserts only. It removes nothing, and in particular it does not clean up
-- the 9 existing source='photo_tag' rows that have no product_tags row behind
-- them:
--
--   red-rock-residence -> ava-table, monk-armchair, tibeau-bed-2, wish-bed
--   fr-house           -> blevio-table, turner-sofa
--   big-barn           -> gillis-armchair
--   forest-house       -> serie-18
--   mafema-apartment   -> nena-armchair-2
--
-- Those come from the AI workstation (app/actions/smartProductTagging.ts),
-- which upserts project_product_links directly and does not write a
-- product_tags row. They are real relationships from a different writer, not
-- debris, and deleting them because a second system cannot see their origin
-- would destroy information to satisfy a tidiness rule.
--
-- The application makes the same choice: reconcilePhotoTagLink only withdraws
-- an edge when the caller has just removed a publicly visible tag for that
-- exact pair, so an unrelated pin edit can never take one of these 9 away.
--
-- Idempotent: re-running matches nothing, because the guard tests for the row
-- this migration creates.

do $$
declare
  v_missing bigint;
begin
  select count(*) into v_missing
  from (
    select distinct pt.listing_id, pt.tagged_listing_id
    from public.product_tags pt
    join public.listings parent on parent.id = pt.listing_id and parent.type = 'project'
    where pt.verification_status in ('verified', 'official')
      and not exists (
        select 1 from public.project_product_links ppl
        where ppl.project_id = pt.listing_id
          and ppl.product_id = pt.tagged_listing_id
      )
  ) s;

  raise notice 'before: % project/product pairs missing a link', v_missing;

  if v_missing = 0 then
    raise notice 'nothing to do — already applied';
  elsif v_missing <> 2 then
    -- 2 was measured on 2026-08-23. A different number means the data moved
    -- under us and this should be re-reviewed, not run.
    raise exception 'expected 2 missing pairs, found % — stopping rather than guessing', v_missing;
  end if;
end $$;

insert into public.project_product_links (project_id, product_id, source)
select distinct
  pt.listing_id,
  pt.tagged_listing_id,
  'photo_tag'
from public.product_tags pt
-- project_product_links is a PROJECT-to-product edge. product_tags permits a
-- product's own gallery to carry tags, and those must not become links.
join public.listings parent
  on parent.id = pt.listing_id
 and parent.type = 'project'
-- The tagged row must still be a live product. The trigger on product_tags
-- enforces this at write time; re-tested here because this repairs history.
join public.listings tagged
  on tagged.id = pt.tagged_listing_id
 and tagged.type = 'product'
 and tagged.deleted_at is null
where pt.verification_status in ('verified', 'official')
  and not exists (
    select 1 from public.project_product_links ppl
    where ppl.project_id = pt.listing_id
      and ppl.product_id = pt.tagged_listing_id
  );

do $$
declare
  v_remaining bigint;
  v_photo_tag bigint;
begin
  select count(*) into v_remaining
  from (
    select distinct pt.listing_id, pt.tagged_listing_id
    from public.product_tags pt
    join public.listings parent on parent.id = pt.listing_id and parent.type = 'project'
    join public.listings tagged on tagged.id = pt.tagged_listing_id
                              and tagged.type = 'product'
                              and tagged.deleted_at is null
    where pt.verification_status in ('verified', 'official')
      and not exists (
        select 1 from public.project_product_links ppl
        where ppl.project_id = pt.listing_id
          and ppl.product_id = pt.tagged_listing_id
      )
  ) s;

  if v_remaining <> 0 then
    raise exception 'backfill incomplete: % pairs still missing a link', v_remaining;
  end if;

  select count(*) into v_photo_tag
    from public.project_product_links where source = 'photo_tag';

  raise notice 'after: 0 pairs missing; project_product_links now holds % photo_tag rows', v_photo_tag;
end $$;
