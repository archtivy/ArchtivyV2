-- Madde 2: move products.color_options free text onto color-family facet values.
--
-- ── WHY THIS IS LOSSLESS ────────────────────────────────────────────────────
-- Measured against production before writing this: 87 product rows exist, 9
-- have a non-empty color_options array, and those 9 use 8 distinct values —
-- Beige, Brown, Black, Gray, Natural, Other, Orange, Red. Every one of them is
-- already a label in the color-family facet (18 values). Nothing is dropped,
-- approximated or guessed; the join below is an exact, case-insensitive label
-- match and anything that fails to match is left untouched rather than
-- discarded.
--
-- ── THE COLUMN IS NOT DROPPED ───────────────────────────────────────────────
-- color_options stays, still populated, and the wizard still submits whatever
-- it loaded. Two reasons. A product whose colours have not been migrated must
-- not be stripped by an unrelated save, and the public detail page still reads
-- the column — repointing that read is a separate change with its own review.
-- This migration adds the structured representation alongside the text; it
-- does not remove the text.
--
-- Idempotent: re-running inserts nothing new, because of the NOT EXISTS guard
-- and the unique (listing_id, facet_value_id) shape of listing_facets.

do $$
declare
  v_missing text;
begin
  -- Fail early and clearly if the facet vocabulary is not what was measured.
  if not exists (select 1 from public.facets where slug = 'color-family') then
    raise exception 'facet "color-family" not found — nothing to migrate onto';
  end if;

  -- Report any free-text value that will NOT map, before writing anything.
  select string_agg(distinct opt, ', ')
    into v_missing
  from public.products p
  cross join lateral jsonb_array_elements_text(
    case jsonb_typeof(to_jsonb(p.color_options))
      when 'array' then to_jsonb(p.color_options)
      else '[]'::jsonb
    end
  ) as opt
  where opt is not null
    and btrim(opt) <> ''
    and not exists (
      select 1
      from public.facet_values fv
      join public.facets f on f.id = fv.facet_id
      where f.slug = 'color-family'
        and lower(btrim(fv.label)) = lower(btrim(opt))
    );

  if v_missing is not null then
    raise warning 'color_options values with no color-family match (left as free text): %', v_missing;
  end if;
end $$;

-- The migration itself: one listing_facets row per (product, matched colour).
insert into public.listing_facets (listing_id, facet_value_id)
select distinct
  p.id,
  fv.id
from public.products p
cross join lateral jsonb_array_elements_text(
  case jsonb_typeof(to_jsonb(p.color_options))
    when 'array' then to_jsonb(p.color_options)
    else '[]'::jsonb
  end
) as opt
join public.facets f
  on f.slug = 'color-family'
join public.facet_values fv
  on fv.facet_id = f.id
 and lower(btrim(fv.label)) = lower(btrim(opt))
-- Only products that still exist as live listings; a soft-deleted or orphaned
-- sidecar row should not acquire new relationships.
join public.listings l
  on l.id = p.id
 and l.deleted_at is null
where not exists (
  select 1 from public.listing_facets lf
  where lf.listing_id = p.id
    and lf.facet_value_id = fv.id
);
