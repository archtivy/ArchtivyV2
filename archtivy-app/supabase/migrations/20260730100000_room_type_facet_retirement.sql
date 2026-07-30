-- ============================================================================
-- APPROVED AND APPLIED 2026-07-30. **CONTAINS DESTRUCTIVE STATEMENTS.**
-- Review copy retained at
--   supabase/migrations-review/PROPOSED_room_type_facet_retirement.sql
--
-- Retires the room-type facet, following the same pattern proven on design-style
-- in 20260728201500_phase6_facet_migration:
--     snapshot -> resolve -> guard -> delete
--
-- D-7 ITEM 11 IS DECIDED: **DROP** (variant B). The single live assignment
--   listing : atlante-wood-outdoor-daybed  (product, APPROVED)
--   value   : room-type/outdoor
-- is deliberately discarded rather than migrated to space_type.
--
-- ⚠️ EXPLICIT SIGN-OFF RECORDED (2026-07-30). Discarding a LIVE assignment is a
--    different class of decision from the 3 zero-assignment discards further
--    down, and was approved separately and on its own terms. It is not covered
--    by, or inferred from, the earlier zero-assignment approval. The row is
--    preserved in archive_snapshots.listing_facets_roomtype_20260730.
--
-- RATIONALE FOR THE DROP (recorded so the deletion is auditable, not implicit):
--   1. Redundant. The listing's own Domain 7 placement already encodes
--      "outdoor" — its taxonomy assignment is `product:outdoor`, whose label is
--      literally "Outdoor & Landscape". The outdoor semantics survive the drop
--      regardless of how D-7 item 1 later refines that placement.
--   2. Wrong predicate. Space Type describes *spaces*. On a *product* the same
--      value means "intended use context", which is a different statement.
--      Phase 6 §B scopes Space Type to projects/spaces; products are not in
--      scope, so migrating this row would have created the first out-of-scope
--      Space Type assignment in the table.
--   3. Lossy either way. The description names four contexts — terraces,
--      poolside settings, decks, landscaped backyards. Only two have nodes
--      (`terrace`, `garden-space`); poolside and deck have none. Any single
--      target would have discarded part of the meaning while appearing precise.
--
-- ── NOW INDEPENDENT OF D-7 ITEMS 1–10 ───────────────────────────────────────
-- Because item 11 resolves to a drop rather than a migration, this migration no
-- longer depends on where item 1 places the daybed. It was previously sequenced
-- after the D-7 resolution migration; it can now be applied before it, in either
-- order, or standalone. Nothing in it reads or writes taxonomy_nodes.
--
-- CASCADE NOTE (verified against production, unchanged since design-style):
--     listing_facets  -> facet_values  ON DELETE CASCADE
--     search_synonyms -> facet_values  ON DELETE CASCADE
--     facet_values    -> facets        ON DELETE CASCADE
--   So `delete from facets where slug='room-type'` destroys 11 facet_values and
--   1 listing_facets row. Under variant B that cascade IS the resolution step —
--   there is no separate delete statement for the assignment.
--
-- DIFFERENCE FROM design-style: room-type has **ZERO** search_synonyms pointing
-- at any of its 11 values (verified). The synonym re-pointing step that
-- design-style required has no analogue here and is intentionally absent — its
-- omission is a verified fact, not an oversight. A guard in step 2 asserts this
-- still holds at apply time, so a synonym added between review and apply cannot
-- be silently destroyed.
-- ============================================================================

-- ── LIVE STATE AT TIME OF REVIEW (2026-07-30) ───────────────────────────────
--   facet: room-type, 11 values, 1 assignment, 0 synonyms
--
--   value             assignments  disposition
--   ----------------  -----------  --------------------------------------------
--   living-room                 0  discarded; would map to space_type:residential-spaces/living-room
--   bedroom                     0  discarded; would map to space_type:residential-spaces/bedroom
--   bathroom                    0  discarded; would map to space_type:residential-spaces/bathroom-residential
--   kitchen                     0  discarded; would map to space_type:residential-spaces/kitchen-residential
--   dining-room                 0  discarded; would map to space_type:residential-spaces/dining-room
--   office                      0  discarded; would map to space_type:workplace-spaces/private-office
--   hallway                     0  discarded; would map to space_type:circulation-support-spaces/corridor
--   outdoor                     1  ⚠️ DROPPED — D-7 item 11, signed off above
--   commercial-space            0  NONE — approved discard (see below)
--   public-space                0  NONE — approved discard (see below)
--   other                       0  NONE — approved discard (see below)
--
-- The 7 zero-assignment values with destinations need NO migration statement:
-- there is nothing to move. Their mapping is recorded above so that retirement
-- is auditable and so a future re-introduction has a documented target. This is
-- the whole reason the table appears in a migration that does not act on it.
--
-- The 3 destination-less values are an APPROVED SCOPE DECISION, carried forward
-- verbatim from 20260728201500 rather than re-litigated:
--   commercial-space   too coarse; Phase 6 §B has no whole-building space value
--   public-space       too coarse; same
--   other              a catch-all; §B has none by design
-- All three carry zero assignments. Phase 6 §B is intentionally finer-grained
-- than the live facet, and a coarse "commercial space" value would re-introduce
-- the Project-Type-inside-Space-Type conflation that §B's exclusion rule forbids.

-- ── STEP 0. Snapshot (non-public schema) ────────────────────────────────────
-- Distinct table names from the 20260728 snapshots so this migration cannot
-- overwrite the design-style safety net. That earlier snapshot is still the only
-- record of 12 deleted facet_values and 24 deleted listing_facets — clobbering it
-- would destroy the rollback path for an already-applied destructive migration.
--
-- Under variant B this snapshot is the ONLY record of the discarded assignment,
-- which makes step 0 running before step 2 load-bearing rather than precautionary.
create schema if not exists archive_snapshots;
revoke all on schema archive_snapshots from anon, authenticated;

drop table if exists archive_snapshots.facets_roomtype_20260730;
create table archive_snapshots.facets_roomtype_20260730 as
  select * from public.facets;

drop table if exists archive_snapshots.facet_values_roomtype_20260730;
create table archive_snapshots.facet_values_roomtype_20260730 as
  select * from public.facet_values;

drop table if exists archive_snapshots.listing_facets_roomtype_20260730;
create table archive_snapshots.listing_facets_roomtype_20260730 as
  select * from public.listing_facets;

drop table if exists archive_snapshots.search_synonyms_roomtype_20260730;
create table archive_snapshots.search_synonyms_roomtype_20260730 as
  select * from public.search_synonyms;

revoke all on all tables in schema archive_snapshots from anon, authenticated;

-- ── STEP 1. Resolve the single live assignment — VARIANT B (DROP) ────────────
-- No statement. The assignment is discarded via step 2's cascade, per the
-- signed-off decision recorded in the header.
--
-- Variant A (migrate to a space_type node) has been DELETED from this file, as
-- instructed, so it cannot be run by accident. It remains in git history if the
-- decision is ever revisited.

-- ── STEP 2. Verify before destroying ────────────────────────────────────────
-- expect_migrated = 0 : VARIANT B — the assignment is deliberately discarded,
-- so NO room-type-bearing listing should gain a space_type assignment. A
-- non-zero result here would mean something migrated it behind this migration's
-- back, and the drop decision no longer describes reality.
do $$
declare
  expect_migrated constant int := 0;   -- VARIANT B (drop). Do not change.
  moved int;
  syn_left int;
  facet_assign int;
begin
  -- How many room-type-bearing listings now carry a space_type assignment.
  select count(distinct lf.listing_id) into moved
  from public.listing_facets lf
  join public.facet_values fv on fv.id = lf.facet_value_id
  join public.facets f        on f.id  = fv.facet_id
  join public.listing_taxonomy_node x on x.listing_id = lf.listing_id
  join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id and tn.domain = 'space_type'
  where f.slug = 'room-type';

  -- Re-assert the zero-synonym fact at apply time. If a synonym was added to a
  -- room-type value between review and apply, it would cascade away in step 3.
  select count(*) into syn_left
  from public.search_synonyms ss
  join public.facet_values fv on fv.id = ss.facet_value_id
  join public.facets f on f.id = fv.facet_id
  where f.slug = 'room-type';

  -- Total room-type assignments still live. Must be exactly 1 — the single row
  -- approved for discard. If a new listing acquired a room-type value since
  -- review, this aborts rather than destroying an unreviewed assignment. The
  -- sign-off covers ONE specific row, not "whatever is there at apply time".
  select count(*) into facet_assign
  from public.listing_facets lf
  join public.facet_values fv on fv.id = lf.facet_value_id
  join public.facets f on f.id = fv.facet_id
  where f.slug = 'room-type';

  if facet_assign <> 1 then
    raise exception 'ABORT: expected exactly 1 room-type assignment (the approved discard), found %. A new assignment appeared since review — re-review before retiring.', facet_assign;
  end if;
  if moved <> expect_migrated then
    raise exception 'ABORT: variant B expects 0 migrated assignment(s), found % — the drop decision no longer matches reality', moved;
  end if;
  if syn_left <> 0 then
    raise exception 'ABORT: % synonym(s) reference room-type values — re-point them first (see 20260728201500 step 2 for the pattern)', syn_left;
  end if;
end $$;

-- Belt-and-braces: assert the snapshot actually captured the row about to be
-- destroyed. Under variant B the snapshot is the only copy, so an empty or
-- stale snapshot table must abort rather than proceed.
do $$
declare snap int;
begin
  select count(*) into snap
  from archive_snapshots.listing_facets_roomtype_20260730 s
  join public.facet_values fv on fv.id = s.facet_value_id
  join public.facets f on f.id = fv.facet_id
  where f.slug = 'room-type';
  if snap <> 1 then
    raise exception 'ABORT: snapshot holds % room-type assignment(s), expected 1 — refusing to discard the only copy', snap;
  end if;
end $$;

-- ── STEP 3. Retire the room-type facet (DESTRUCTIVE) ────────────────────────
-- Cascades to its 11 facet_values and their 1 listing_facets row. That single
-- row is the approved discard.
delete from public.facets where slug = 'room-type';

-- ── STEP 4. Post-apply verification (run manually) ──────────────────────────
--   expect 4 facets remaining: architectural-element, color-family,
--                              finish-texture, sustainability
--     select slug from public.facets order by slug;
--
--   expect 46 facet_values (57 - 11):
--     select count(*) from public.facet_values;
--
--   expect 83 listing_facets (84 - 1):
--     select count(*) from public.listing_facets;
--
--   expect 0 — variant B creates no space_type assignment:
--     select count(*) from public.listing_taxonomy_node x
--     join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
--     where tn.domain = 'space_type';
--
--   expect 1 — the discarded row, recoverable from the snapshot:
--     select count(*) from archive_snapshots.listing_facets_roomtype_20260730 s
--     join archive_snapshots.facet_values_roomtype_20260730 fv on fv.id = s.facet_value_id
--     join archive_snapshots.facets_roomtype_20260730 f on f.id = fv.facet_id
--     where f.slug = 'room-type';
--
--   expect unchanged — the daybed keeps its outdoor semantics via Domain 7:
--     select tn.slug_path from public.listing_taxonomy_node x
--     join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
--     join public.listings l on l.id = x.listing_id
--     where l.slug = 'atlante-wood-outdoor-daybed';

-- ============================================================================
-- WHAT THIS MIGRATION DOES **NOT** TOUCH
-- ============================================================================
-- Retained as Controlled Attributes per Phase 6 §G, unchanged:
--   color-family            18 values, 64 assignments
--   finish-texture          10 values, 14 assignments
--   architectural-element   10 values,  0 assignments
--   sustainability           8 values,  5 assignments  (hold accepted — the 6 §J
--                                       categories exist as taxonomy alongside it)
--
-- Also untouched: taxonomy_nodes (no read, no write), listing_taxonomy_node
-- (no read, no write under variant B), and all D-7 items 1–10.
-- ============================================================================

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- There is no in-place rollback. Variant B performs no insert, so nothing can be
-- reversed by deleting it — the facet rows and the one assignment are simply gone.
--
-- Restore from, in this order (to satisfy the FK chain):
--   1. archive_snapshots.facets_roomtype_20260730          -> public.facets
--   2. archive_snapshots.facet_values_roomtype_20260730    -> public.facet_values
--   3. archive_snapshots.listing_facets_roomtype_20260730  -> public.listing_facets
-- filtering each to the room-type rows only, so the restore does not disturb the
-- 4 retained facets. Pro Plan PITR (7-day) is the second line of defence.
