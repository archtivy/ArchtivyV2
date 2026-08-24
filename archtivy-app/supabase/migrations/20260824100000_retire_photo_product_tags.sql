-- Retire public.photo_product_tags.
--
-- ── WHY IT CAN GO ───────────────────────────────────────────────────────────
-- product_tags superseded it. Every row photo_product_tags holds already exists
-- in product_tags with matching coordinates (the legacy table stored x/y as
-- 0–1, product_tags stores 0–100, so the values differ by a factor of 100 and
-- nothing else). Measured before writing:
--
--   photo_product_tags   7 rows,  last write 2026-03-11
--   product_tags        12 rows,  last write 2026-08-24
--   legacy rows with no product_tags counterpart:  0
--
-- ── ITS WRITE PATHS HAD BEEN BROKEN FOR MONTHS ──────────────────────────────
-- The table has six columns: id, listing_image_id, product_id (NOT NULL), x, y,
-- created_at. The application wrote eight more that never existed —
-- product_type_id, product_category_id, product_subcategory_id, category_text,
-- color_text, material_id, feature_text, created_by_clerk_id.
--
-- So createPhotoProductTagPlaceholder (inserting product_id NULL into a NOT
-- NULL column) and updatePhotoProductTag (writing phantom columns) failed on
-- every call, and the admin UI swallowed the error. That is why the last
-- successful write was five months ago: the editorial workstation's metadata
-- editor has been saving nothing, silently, since the schema diverged.
--
-- ── NOTHING READS IT ANY MORE ───────────────────────────────────────────────
-- As of the accompanying code change:
--   · the two admin detail pages read product_tags (getProductTagsByImageIds)
--   · the public project page always read product_tags, via
--     getProjectDetail -> getHotspotsForListing
--   · the one public-side reader of this table lived in ProjectDetailRenderer,
--     which had zero consumers and has been deleted
--
-- ── THE VERIFICATION GUARD ──────────────────────────────────────────────────
-- This refuses to drop the table if a row ever appears without a product_tags
-- counterpart. Data loss is irreversible and a surprise row means the premise
-- of this migration no longer holds, so it stops rather than proceeding.

do $$
declare
  v_total     bigint;
  v_unmirrored bigint;
begin
  if to_regclass('public.photo_product_tags') is null then
    raise notice 'photo_product_tags does not exist — already retired';
    return;
  end if;

  select count(*) into v_total from public.photo_product_tags;

  select count(*) into v_unmirrored
  from public.photo_product_tags p
  where not exists (
    select 1 from public.product_tags t
    where t.listing_image_id = p.listing_image_id
      and t.tagged_listing_id = p.product_id
  );

  raise notice 'photo_product_tags: % row(s), % without a product_tags counterpart',
    v_total, v_unmirrored;

  if v_unmirrored <> 0 then
    raise exception
      '% legacy tag(s) have no product_tags counterpart — migrate them before dropping, not after',
      v_unmirrored;
  end if;
end $$;

-- No CASCADE, deliberately. Nothing should depend on this table; if something
-- does, the drop must fail loudly so the dependency is looked at rather than
-- silently destroyed along with it.
drop table if exists public.photo_product_tags;

do $$
begin
  if to_regclass('public.photo_product_tags') is null then
    raise notice 'after: photo_product_tags dropped';
  else
    raise exception 'photo_product_tags still exists after drop';
  end if;
end $$;
