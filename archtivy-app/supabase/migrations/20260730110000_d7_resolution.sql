-- ============================================================================
-- APPROVED AND APPLIED 2026-07-30. Contains DELETEs of existing assignments.
-- Review copy retained at
--   supabase/migrations-review/PROPOSED_d7_resolution.sql
--
-- D-7 resolution: re-classifies 10 listings off taxonomy roots and conflated
-- nodes onto the destinations decided per-item on 2026-07-30.
--
-- Item 11 is NOT here — it resolved to a drop and was applied separately in
-- 20260730100000_room_type_facet_retirement.
--
-- ── DECISION RECORD (verbatim, one line per item) ───────────────────────────
--   1e  Atlante Wood Outdoor Daybed     -> CREATE outdoor-furniture/daybed, use it
--   2e  Hamptons Outdoor Daybed         -> same new daybed node
--   3a  Ortigia Outdoor Armchair        -> outdoor-furniture/outdoor-seating
--   4a  Pico Outdoor Coffee/Side Table  -> outdoor-furniture/outdoor-table
--   5d  Boston Commonwealth Pier        -> commercial/mixed-use PRIMARY
--                                       + landscape-urban/waterfront secondary
--                                       + intervention adaptive-reuse
--   6a  Malmö Live                      -> cultural/concert-hall PRIMARY
--                                       + hospitality/hotel secondary
--                                       + hospitality/convention-center secondary
--   7b  Vectura Campus F                -> commercial/mixed-use PRIMARY
--                                       + education/research-facility secondary
--   8a  VIA Oslo                        -> commercial/mixed-use PRIMARY
--                                       + intervention adaptive-reuse
--   9d  Spark Capital - Mercer          -> office/corporate-office PRIMARY
--                                       + intervention interior-fit-out
--                                       + space_type workplace-spaces
--                                       + style japanese
--  10c  Rua da Rosa Lisbon              -> residential/housing-complex PRIMARY
--                                       + intervention renovation
--                                       + intervention restoration
--
-- ── PRE-FLIGHT VERIFIED AGAINST PRODUCTION (2026-07-30) ─────────────────────
--   17 of 18 destination nodes already exist and are active.
--   The 18th — product:outdoor/outdoor-furniture/daybed — does NOT exist and is
--   created by step 1. That creation is what decisions 1e and 2e authorize; no
--   other node is added.
--
-- ⚠️ NO "ONE PRIMARY PER LISTING" CONSTRAINT EXISTS.
--    listing_taxonomy_node has only UNIQUE (listing_id, taxonomy_node_id).
--    Nothing in the schema prevents a listing ending up with two is_primary=true
--    rows, which is the most likely way this migration could corrupt data: insert
--    a new primary, fail to delete the old one, and every "the" primary lookup
--    silently picks whichever the planner returns first. Step 4's first guard
--    asserts exactly one primary per affected listing. It is the load-bearing
--    check in this file, not a formality.
--
-- CONVENTION: only the Project Type / Product Type assignment is is_primary=true.
-- Every supporting-dimension assignment (intervention_type, space_type, style)
-- and every secondary Project Type is is_primary=false, matching how the 95
-- material and 24 style assignments already behave.
-- ============================================================================

-- ── STEP 0. Snapshot ────────────────────────────────────────────────────────
-- listing_taxonomy_node is the only table whose existing rows are deleted.
-- Distinct name from the two earlier snapshot sets so neither is clobbered —
-- archive_snapshots already holds 9 tables suffixed 20260728 (4 from the
-- design-style retirement, 5 from Phase A) plus 4 suffixed roomtype_20260730.
create schema if not exists archive_snapshots;
revoke all on schema archive_snapshots from anon, authenticated;

drop table if exists archive_snapshots.listing_taxonomy_node_d7_20260730;
create table archive_snapshots.listing_taxonomy_node_d7_20260730 as
  select * from public.listing_taxonomy_node;

-- listings is also modified (taxonomy_node_id by step 3b; category and
-- project_category by step 3c), so the columns those steps overwrite are
-- captured too. Only the identity + affected columns — this is a rollback aid,
-- not a copy of every listing body.
drop table if exists archive_snapshots.listings_d7_cols_20260730;
create table archive_snapshots.listings_d7_cols_20260730 as
  select id, slug, taxonomy_node_id, category, project_category
  from public.listings;

revoke all on all tables in schema archive_snapshots from anon, authenticated;

-- ── STEP 1. Create the Daybed type (decisions 1e + 2e) ──────────────────────
-- Neither outdoor branch had a daybed type, which is why items 1 and 2 could not
-- be resolved without creating one. Placed under Domain 7's outdoor-furniture
-- family, NOT Domain 1's — consistent with items 3 and 4 landing there, so all
-- four Flexform outdoor pieces stay in one tree.
--
-- sort_order 5: siblings currently run 0,0,0,1,2,3,4 (three tied at 0 — a
-- pre-existing inconsistency in the seeded data, not corrected here). 5 puts
-- Daybed last without renumbering anything.
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, synonyms, sort_order)
select
  'product', p.id, 2, 'daybed', 'outdoor/outdoor-furniture/daybed', 'Daybed',
  'Outdoor daybed — an elongated lounge seat for reclining, distinct from both seating and beds. Created for D-7 items 1 and 2; no daybed type existed in either outdoor branch.',
  '{"Sun Lounger","Chaise Longue"}',
  5
from public.taxonomy_nodes p
where p.domain = 'product' and p.slug_path = 'outdoor/outdoor-furniture'
on conflict (domain, slug_path) do nothing;

-- ── STEP 2. Insert the new assignments ──────────────────────────────────────
-- Driven from an explicit table so every editorial decision is one readable row
-- and the diff is auditable line by line. Slug-based lookups throughout — no
-- hardcoded UUIDs, so this cannot silently target the wrong node.
--
-- Insert runs BEFORE the delete in step 3. Old and new nodes always differ, so
-- UNIQUE (listing_id, taxonomy_node_id) is never contended; the ordering just
-- means a guard failure rolls back with the original rows still present.
insert into public.listing_taxonomy_node (listing_id, taxonomy_node_id, is_primary)
select l.id, tn.id, v.is_primary
from (values
  -- item 1e ─ Atlante Wood Outdoor Daybed
  ('atlante-wood-outdoor-daybed',    'product',           'outdoor/outdoor-furniture/daybed',           true ),
  -- item 2e ─ Hamptons Outdoor Daybed
  ('hamptons-outdoor-daybed',        'product',           'outdoor/outdoor-furniture/daybed',           true ),
  -- item 3a ─ Ortigia Outdoor Armchair
  ('ortigia-outdoor-armchair',       'product',           'outdoor/outdoor-furniture/outdoor-seating',  true ),
  -- item 4a ─ Pico Outdoor Coffee - Side Table
  ('pico-outdoor-coffee-side-table', 'product',           'outdoor/outdoor-furniture/outdoor-table',    true ),
  -- item 5d ─ Boston Commonwealth Pier
  ('boston-commonwealth-pier-2',     'project',           'commercial/mixed-use',                       true ),
  ('boston-commonwealth-pier-2',     'project',           'landscape-urban/waterfront',                 false),
  ('boston-commonwealth-pier-2',     'intervention_type', 'adaptive-reuse',                             false),
  -- item 6a ─ Malmö Live
  ('malm-live',                      'project',           'cultural/concert-hall',                      true ),
  ('malm-live',                      'project',           'hospitality/hotel',                          false),
  ('malm-live',                      'project',           'hospitality/convention-center',              false),
  -- item 7b ─ Vectura Campus F — Stockholm
  ('vectura-campus-f-stockholm',     'project',           'commercial/mixed-use',                       true ),
  ('vectura-campus-f-stockholm',     'project',           'education/research-facility',                false),
  -- item 8a ─ VIA Oslo — Modern Office & Retail
  ('via-oslo-modern-office-retail',  'project',           'commercial/mixed-use',                       true ),
  ('via-oslo-modern-office-retail',  'intervention_type', 'adaptive-reuse',                             false),
  -- item 9d ─ Spark Capital - Mercer  (existing material:wood is left untouched)
  ('spark-capital-mercer',           'project',           'office/corporate-office',                    true ),
  ('spark-capital-mercer',           'intervention_type', 'interior-fit-out',                           false),
  ('spark-capital-mercer',           'space_type',        'workplace-spaces',                           false),
  ('spark-capital-mercer',           'style',             'japanese',                                   false),
  -- item 10c ─ Rua da Rosa Lisbon  (both interventions — renovation AND restoration)
  ('rua-da-rosa-lisbon',             'project',           'residential/housing-complex',                true ),
  ('rua-da-rosa-lisbon',             'intervention_type', 'renovation',                                 false),
  ('rua-da-rosa-lisbon',             'intervention_type', 'restoration',                                false)
) as v(listing_slug, dom, slug_path, is_primary)
join public.listings      l  on l.slug = v.listing_slug
join public.taxonomy_nodes tn on tn.domain = v.dom and tn.slug_path = v.slug_path
where not exists (
  select 1 from public.listing_taxonomy_node x
  where x.listing_id = l.id and x.taxonomy_node_id = tn.id
);

-- Guard: all 21 intended rows resolved. A typo in a listing slug or a slug_path
-- would make its JOIN produce nothing and the row would vanish silently — this
-- is the check that turns that into an abort.
do $$
declare inserted int;
begin
  select count(*) into inserted
  from public.listing_taxonomy_node x
  join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
  join public.listings l on l.id = x.listing_id
  where (l.slug, tn.domain, tn.slug_path) in (
    ('atlante-wood-outdoor-daybed','product','outdoor/outdoor-furniture/daybed'),
    ('hamptons-outdoor-daybed','product','outdoor/outdoor-furniture/daybed'),
    ('ortigia-outdoor-armchair','product','outdoor/outdoor-furniture/outdoor-seating'),
    ('pico-outdoor-coffee-side-table','product','outdoor/outdoor-furniture/outdoor-table'),
    ('boston-commonwealth-pier-2','project','commercial/mixed-use'),
    ('boston-commonwealth-pier-2','project','landscape-urban/waterfront'),
    ('boston-commonwealth-pier-2','intervention_type','adaptive-reuse'),
    ('malm-live','project','cultural/concert-hall'),
    ('malm-live','project','hospitality/hotel'),
    ('malm-live','project','hospitality/convention-center'),
    ('vectura-campus-f-stockholm','project','commercial/mixed-use'),
    ('vectura-campus-f-stockholm','project','education/research-facility'),
    ('via-oslo-modern-office-retail','project','commercial/mixed-use'),
    ('via-oslo-modern-office-retail','intervention_type','adaptive-reuse'),
    ('spark-capital-mercer','project','office/corporate-office'),
    ('spark-capital-mercer','intervention_type','interior-fit-out'),
    ('spark-capital-mercer','space_type','workplace-spaces'),
    ('spark-capital-mercer','style','japanese'),
    ('rua-da-rosa-lisbon','project','residential/housing-complex'),
    ('rua-da-rosa-lisbon','intervention_type','renovation'),
    ('rua-da-rosa-lisbon','intervention_type','restoration')
  );
  if inserted <> 21 then
    raise exception 'ABORT: expected 21 target assignments present, found % — a listing slug or destination slug_path did not resolve', inserted;
  end if;
end $$;

-- ── STEP 3. Delete the superseded assignments (DESTRUCTIVE) ─────────────────
-- 10 rows: the root/conflated assignment each listing is being moved off.
--
-- Items 5–8 sat on the `commercial` ROOT (depth 0, an aggregator — never a valid
-- classification). Items 9 and 10 sat on conflated nodes: `interior/*` encodes an
-- Intervention, and `other/renovation-restoration` encodes an Intervention — both
-- now expressed on the intervention_type dimension instead, which is precisely
-- what decisions 9d and 10c replace them with.
--
-- Decisions 9d and 10c were chosen over their "keep the old node too" variants
-- (9c and 10d), so these deletes are the intended effect of the choice, not an
-- extra step added on top of it.
delete from public.listing_taxonomy_node x
using public.listings l, public.taxonomy_nodes tn
where x.listing_id = l.id
  and x.taxonomy_node_id = tn.id
  and (l.slug, tn.domain, tn.slug_path) in (
    ('atlante-wood-outdoor-daybed',    'product', 'outdoor'),
    ('hamptons-outdoor-daybed',        'product', 'outdoor'),
    ('ortigia-outdoor-armchair',       'product', 'outdoor'),
    ('pico-outdoor-coffee-side-table', 'product', 'outdoor'),
    ('boston-commonwealth-pier-2',     'project', 'commercial'),
    ('malm-live',                      'project', 'commercial'),
    ('vectura-campus-f-stockholm',     'project', 'commercial'),
    ('via-oslo-modern-office-retail',  'project', 'commercial'),
    ('spark-capital-mercer',           'project', 'interior/workplace-interior'),
    ('rua-da-rosa-lisbon',             'project', 'other/renovation-restoration')
  );

-- ── STEP 3b. Re-point listings.taxonomy_node_id (REQUIRED, not optional) ────
--
-- ⚠️ WITHOUT THIS STEP THE ENTIRE MIGRATION IS COSMETIC.
--
-- listings.taxonomy_node_id is a DENORMALIZED POINTER to the listing's primary
-- node, held alongside the listing_taxonomy_node junction row. The invariant is
-- established in src/app/actions/taxonomySync.ts:255-271, which sets
--   listings.taxonomy_node_id = <node>
-- and upserts
--   listing_taxonomy_node(listing_id, <node>, is_primary = true)
-- for the SAME node, in the same operation.
--
-- It is the PRIMARY DISCOVERY PATH, not a cache: src/lib/db/explore.ts:345 and
-- :471 resolve an archive page's listings with
--   .in("taxonomy_node_id", nodeIds)
-- Updating the junction table alone would leave all 10 listings still appearing
-- under their OLD archive pages and never under their new ones — the junction
-- rows would be correct and the site would be unchanged.
--
-- Verified: all 10 listings currently have this column populated, each pointing
-- at exactly the node this migration moves them off.
update public.listings l
set taxonomy_node_id = tn.id
from public.listing_taxonomy_node x
join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
where x.listing_id = l.id
  and x.is_primary
  and l.slug in ('atlante-wood-outdoor-daybed','hamptons-outdoor-daybed',
                 'ortigia-outdoor-armchair','pico-outdoor-coffee-side-table',
                 'boston-commonwealth-pier-2','malm-live',
                 'vectura-campus-f-stockholm','via-oslo-modern-office-retail',
                 'spark-capital-mercer','rua-da-rosa-lisbon');

-- ── STEP 3c. Refresh listings.category for items 5–8 ────────────────────────
--
-- Scope: the 4 listings whose category is now visibly wrong. Malmö Live is the
-- clearest — it reads 'Commercial' for a concert hall.
--
-- BOTH columns are written. src/app/actions/createProject.ts:257-258 sets
-- `category` and `project_category` to the same value on every create, and all
-- 6 D-7 project listings currently mirror each other. Updating one alone would
-- replace one inconsistency with another.
--
-- Value = the primary node's own label, derived rather than hardcoded so the
-- column cannot drift from the taxonomy it is meant to mirror:
--   boston-commonwealth-pier-2     Commercial -> Mixed-Use
--   malm-live                      Commercial -> Concert Hall
--   vectura-campus-f-stockholm     Commercial -> Mixed-Use
--   via-oslo-modern-office-retail  Commercial -> Mixed-Use
--
-- Why the node LABEL and not legacy_project_category: legacy_project_category is
-- populated on ROOT nodes only ('commercial' -> 'Commercial') and is NULL on all
-- four depth-1 destinations, so it cannot supply a value. The column has no
-- single convention anyway — it already mixes root labels ('Commercial',
-- 'Residential') with depth-1 labels ('Single-Family House', 'Office Building',
-- 'Housing Complex'), so a depth-1 label matches existing precedent.
--
-- SAFE FOR EXPLORE — verified, not assumed. src/lib/db/explore.ts:396 filters on
-- legacy category text ONLY for rows where taxonomy_node_id IS NULL. After step
-- 3b every one of these listings has a non-NULL taxonomy_node_id, so the legacy
-- text path cannot apply to them and changing the string cannot drop them from
-- explore. There is also no CHECK constraint on the column.
--
-- NOT INCLUDED, per scope: item 9 (spark-capital-mercer, category NULL) and item
-- 10 (rua-da-rosa-lisbon, category 'Renovation / Restoration'). Item 10's value
-- is now just as wrong as the four above — it names an Intervention, not a
-- Project Type. It stays in follow-up 8 because the approved scope was items 5–8.
update public.listings l
set category = tn.label,
    project_category = tn.label
from public.listing_taxonomy_node x
join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
where x.listing_id = l.id
  and x.is_primary
  and tn.domain = 'project'
  and l.slug in ('boston-commonwealth-pier-2','malm-live',
                 'vectura-campus-f-stockholm','via-oslo-modern-office-retail');

-- ── STEP 4. Guards ──────────────────────────────────────────────────────────
do $$
declare
  multi_primary int;
  no_primary    int;
  stale         int;
  total         int;
  daybed_users  int;
begin
  -- 4a. THE load-bearing check. No schema constraint enforces this, so a missed
  --     delete would leave two is_primary=true rows and every "the primary"
  --     lookup would become nondeterministic.
  select count(*) into multi_primary from (
    select x.listing_id
    from public.listing_taxonomy_node x
    join public.listings l on l.id = x.listing_id
    where l.slug in ('atlante-wood-outdoor-daybed','hamptons-outdoor-daybed',
                     'ortigia-outdoor-armchair','pico-outdoor-coffee-side-table',
                     'boston-commonwealth-pier-2','malm-live',
                     'vectura-campus-f-stockholm','via-oslo-modern-office-retail',
                     'spark-capital-mercer','rua-da-rosa-lisbon')
      and x.is_primary
    group by x.listing_id having count(*) > 1
  ) t;
  if multi_primary > 0 then
    raise exception 'ABORT: % listing(s) have more than one is_primary=true assignment', multi_primary;
  end if;

  -- 4b. And none may have lost its primary entirely.
  select count(*) into no_primary
  from public.listings l
  where l.slug in ('atlante-wood-outdoor-daybed','hamptons-outdoor-daybed',
                   'ortigia-outdoor-armchair','pico-outdoor-coffee-side-table',
                   'boston-commonwealth-pier-2','malm-live',
                   'vectura-campus-f-stockholm','via-oslo-modern-office-retail',
                   'spark-capital-mercer','rua-da-rosa-lisbon')
    and not exists (
      select 1 from public.listing_taxonomy_node x
      where x.listing_id = l.id and x.is_primary
    );
  if no_primary > 0 then
    raise exception 'ABORT: % listing(s) have no primary assignment', no_primary;
  end if;

  -- 4c. Every superseded assignment is gone.
  select count(*) into stale
  from public.listing_taxonomy_node x
  join public.listings l on l.id = x.listing_id
  join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
  where (l.slug, tn.domain, tn.slug_path) in (
    ('atlante-wood-outdoor-daybed','product','outdoor'),
    ('hamptons-outdoor-daybed','product','outdoor'),
    ('ortigia-outdoor-armchair','product','outdoor'),
    ('pico-outdoor-coffee-side-table','product','outdoor'),
    ('boston-commonwealth-pier-2','project','commercial'),
    ('malm-live','project','commercial'),
    ('vectura-campus-f-stockholm','project','commercial'),
    ('via-oslo-modern-office-retail','project','commercial'),
    ('spark-capital-mercer','project','interior/workplace-interior'),
    ('rua-da-rosa-lisbon','project','other/renovation-restoration')
  );
  if stale > 0 then
    raise exception 'ABORT: % superseded assignment(s) still present', stale;
  end if;

  -- 4d. Net row count: 245 before, +21 inserted, -10 deleted = 256.
  select count(*) into total from public.listing_taxonomy_node;
  if total <> 256 then
    raise exception 'ABORT: expected 256 assignments (245 + 21 - 10), found %', total;
  end if;

  -- 4e. The new Daybed node must serve exactly the two listings it was created
  --     for — proof the shared node was reused rather than duplicated.
  select count(*) into daybed_users
  from public.listing_taxonomy_node x
  join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
  where tn.domain = 'product' and tn.slug_path = 'outdoor/outdoor-furniture/daybed';
  if daybed_users <> 2 then
    raise exception 'ABORT: Daybed node has % assignment(s), expected 2', daybed_users;
  end if;
end $$;

-- 4f. The denormalization invariant: listings.taxonomy_node_id must equal the
--     node of the is_primary junction row. Checked across the WHOLE table, not
--     just the 10 touched listings — if this migration broke the invariant
--     elsewhere, or it was already broken, that should surface now rather than
--     as missing listings on an archive page.
do $$
declare drifted int; unpointed int;
begin
  select count(*) into drifted
  from public.listings l
  join public.listing_taxonomy_node x on x.listing_id = l.id and x.is_primary
  where l.taxonomy_node_id is not null
    and l.taxonomy_node_id <> x.taxonomy_node_id;
  if drifted > 0 then
    raise exception 'ABORT: % listing(s) have taxonomy_node_id disagreeing with their is_primary junction row', drifted;
  end if;

  -- And specifically: none of the 10 may point at a node it was moved off.
  select count(*) into unpointed
  from public.listings l
  join public.taxonomy_nodes tn on tn.id = l.taxonomy_node_id
  where (l.slug, tn.domain, tn.slug_path) in (
    ('atlante-wood-outdoor-daybed','product','outdoor'),
    ('hamptons-outdoor-daybed','product','outdoor'),
    ('ortigia-outdoor-armchair','product','outdoor'),
    ('pico-outdoor-coffee-side-table','product','outdoor'),
    ('boston-commonwealth-pier-2','project','commercial'),
    ('malm-live','project','commercial'),
    ('vectura-campus-f-stockholm','project','commercial'),
    ('via-oslo-modern-office-retail','project','commercial'),
    ('spark-capital-mercer','project','interior/workplace-interior'),
    ('rua-da-rosa-lisbon','project','other/renovation-restoration')
  );
  if unpointed > 0 then
    raise exception 'ABORT: % listing(s) still point at a superseded node via taxonomy_node_id', unpointed;
  end if;
end $$;

-- 4g. Category refresh landed on exactly the 4 in scope, and category still
--     mirrors project_category.
do $$
declare refreshed int; mismatched int;
begin
  select count(*) into refreshed
  from public.listings l
  where (l.slug, l.category) in (
    ('boston-commonwealth-pier-2',    'Mixed-Use'),
    ('malm-live',                     'Concert Hall'),
    ('vectura-campus-f-stockholm',    'Mixed-Use'),
    ('via-oslo-modern-office-retail', 'Mixed-Use')
  );
  if refreshed <> 4 then
    raise exception 'ABORT: expected 4 refreshed categories, found %', refreshed;
  end if;

  select count(*) into mismatched
  from public.listings l
  where l.slug in ('boston-commonwealth-pier-2','malm-live',
                   'vectura-campus-f-stockholm','via-oslo-modern-office-retail')
    and l.category is distinct from l.project_category;
  if mismatched > 0 then
    raise exception 'ABORT: % listing(s) have category out of sync with project_category', mismatched;
  end if;
end $$;

-- ── STEP 5. Post-apply verification (run manually) ──────────────────────────
--   expect 1101 nodes (1100 + the new Daybed):
--     select count(*) from public.taxonomy_nodes;
--
--   expect 256 assignments:
--     select count(*) from public.listing_taxonomy_node;
--
--   expect exactly 1 primary for each of the 10 listings:
--     select l.slug, count(*) filter (where x.is_primary) as primaries, count(*) as total
--     from public.listings l join public.listing_taxonomy_node x on x.listing_id = l.id
--     where l.slug in (...the 10...) group by l.slug order by l.slug;
--
--   expect 0 for all four — the aggregator roots and conflated nodes are now empty,
--   which is what makes the deferred root cleanup safe to do later:
--     select tn.domain, tn.slug_path, count(x.id)
--     from public.taxonomy_nodes tn
--     left join public.listing_taxonomy_node x on x.taxonomy_node_id = tn.id
--     where (tn.domain,tn.slug_path) in (('product','outdoor'),('project','commercial'),
--            ('project','interior/workplace-interior'),('project','other/renovation-restoration'))
--     group by 1,2;

-- ============================================================================
-- WHAT THIS MIGRATION DOES **NOT** DO
-- ============================================================================
-- Consciously excluded — all 8 items are logged in D7_CLEANUP_FOLLOWUPS.md as one
-- consolidated task, per the decision to defer them rather than resolve any now:
--   1. Project-root overlap (commercial / office / retail / interior)
--   2. Two competing outdoor-furniture branches (Domain 1 vs Domain 7)
--   3. Duplicate outdoor types (lounge/outdoor-lounge, decking ×2, screen ×2, pergola ×2)
--   4. (resolved here — the Daybed type is created by step 1)
--   5. Listings bundling multiple products under one title (items 1 and 4)
--   6. Missing material assignments (items 2, 3, 4)
--   7. other/unbuilt-conceptual encoding build status as a Project Type
--   8. Stale listings.category — PARTIALLY resolved here (items 5–8 only, step 3c).
--      Still open: item 9 (NULL), item 10 ('Renovation / Restoration' — an
--      Intervention, not a Project Type), the 'Recidence' typo, and the broader
--      question of whether the column should be dropped now that
--      listing_taxonomy_node is authoritative.
--
-- Item 9's Space Type is workplace-spaces ONLY. The review doc floated adding
-- circulation-support-spaces for the reception and conference rooms, but that was
-- parenthetical context, not part of option (b)/(d) — so it is excluded rather
-- than assumed.
-- ============================================================================

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Fully reversible. Reverse order:
--   1. delete the 21 inserted assignments (the step-2 VALUES list)
--   2. re-insert the 10 deleted ones from
--      archive_snapshots.listing_taxonomy_node_d7_20260730
--   3. delete the Daybed node:
--        delete from public.taxonomy_nodes
--        where domain='product' and slug_path='outdoor/outdoor-furniture/daybed';
--      Safe only after step 1 — listing_taxonomy_node.taxonomy_node_id cascades
--      on delete, so dropping the node first would silently take its 2
--      assignments with it instead of erroring.
--
--   4. restore the listings columns (steps 3b and 3c):
--        update public.listings l
--        set taxonomy_node_id = s.taxonomy_node_id,
--            category         = s.category,
--            project_category = s.project_category
--        from archive_snapshots.listings_d7_cols_20260730 s
--        where s.id = l.id;
--      Run this BEFORE deleting the Daybed node — listings.taxonomy_node_id may
--      reference it, and restoring afterwards would fail or null out.
--
-- Simplest full restore:
--   truncate public.listing_taxonomy_node;
--   insert into public.listing_taxonomy_node
--     select * from archive_snapshots.listing_taxonomy_node_d7_20260730;
--   update public.listings l
--   set taxonomy_node_id = s.taxonomy_node_id, category = s.category,
--       project_category = s.project_category
--   from archive_snapshots.listings_d7_cols_20260730 s where s.id = l.id;
--   -- then delete the Daybed node as above.
