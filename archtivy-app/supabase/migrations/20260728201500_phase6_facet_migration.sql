-- ============================================================================
-- CONTAINS DESTRUCTIVE STATEMENTS — snapshots to archive_snapshots first (step 0).
--
-- Migrates the design-style facet into the style taxonomy dimension, then
-- retires that facet. Separated from tranche 2 so a node-content problem and a
-- destructive problem never share a rollback.
--
-- REQUIRES 20260728_phase6_tranche2_nodes FIRST — every destination node must
-- exist before an assignment can point at it.
--
-- ⚠️ TWO CASCADES MAKE FACET RETIREMENT MORE DESTRUCTIVE THAN IT LOOKS.
--    Verified against production:
--      listing_facets  -> facet_values  ON DELETE CASCADE
--      search_synonyms -> facet_values  ON DELETE CASCADE
--      facet_values    -> facets        ON DELETE CASCADE
--    So `delete from facets where slug='design-style'` destroys 12 facet_values,
--    24 listing_facets AND 4 search_synonyms. Steps 1 and 2 below preserve the
--    assignments and the synonyms before step 4 removes anything.
--
-- SCOPE: design-style only. room-type retirement is deliberately NOT included —
-- see the block at the end.
-- ============================================================================

-- ── STEP 0. Snapshot (non-public schema) ────────────────────────────────────
create schema if not exists archive_snapshots;
revoke all on schema archive_snapshots from anon, authenticated;

drop table if exists archive_snapshots.facets_20260728;
create table archive_snapshots.facets_20260728 as
  select * from public.facets;

drop table if exists archive_snapshots.facet_values_20260728;
create table archive_snapshots.facet_values_20260728 as
  select * from public.facet_values;

drop table if exists archive_snapshots.listing_facets_20260728;
create table archive_snapshots.listing_facets_20260728 as
  select * from public.listing_facets;

drop table if exists archive_snapshots.search_synonyms_20260728;
create table archive_snapshots.search_synonyms_20260728 as
  select * from public.search_synonyms;

revoke all on all tables in schema archive_snapshots from anon, authenticated;

-- ── STEP 1. Migrate the 24 assignments ──────────────────────────────────────
--
-- design-style value -> style taxonomy slug. EXPLICIT, one row per live value.
-- All 12 live values map; slugs are identical in 11 of 12 cases, so this is a
-- direct join on slug rather than a translation table.
--
--   live facet value      -> style node          assignments
--   --------------------     ------------------   -----------
--   contemporary          -> contemporary                 17
--   minimalist            -> minimalist                    7
--   mid-century-modern    -> mid-century-modern            0
--   scandinavian          -> scandinavian                  0
--   industrial            -> industrial                    0
--   art-deco              -> art-deco                      0
--   traditional           -> traditional                   0
--   rustic                -> rustic                        0
--   biophilic             -> biophilic                     0
--   brutalist             -> brutalist                     0
--   japanese              -> japanese                      0
--   mediterranean         -> mediterranean                 0
--                                          TOTAL          24
--
-- Only 2 of 12 values carry assignments, and both are exact-name matches, so no
-- assignment depends on a rename or a judgement call.
--
-- is_primary = false: style is a secondary classification. Matches how the 95
-- material assignments already behave in this table.
insert into public.listing_taxonomy_node (listing_id, taxonomy_node_id, is_primary)
select distinct lf.listing_id, tn.id, false
from public.listing_facets lf
join public.facet_values fv on fv.id = lf.facet_value_id
join public.facets f        on f.id  = fv.facet_id
join public.taxonomy_nodes tn on tn.domain = 'style' and tn.slug = fv.slug
where f.slug = 'design-style'
  and not exists (
    select 1 from public.listing_taxonomy_node x
    where x.listing_id = lf.listing_id and x.taxonomy_node_id = tn.id
  );

-- Guard: every design-style assignment must now have a taxonomy twin.
-- Aborts the migration rather than proceeding to a destructive step with a gap.
do $$
declare unmigrated int;
begin
  select count(*) into unmigrated
  from public.listing_facets lf
  join public.facet_values fv on fv.id = lf.facet_value_id
  join public.facets f        on f.id  = fv.facet_id
  where f.slug = 'design-style'
    and not exists (
      select 1
      from public.taxonomy_nodes tn
      join public.listing_taxonomy_node x
        on x.taxonomy_node_id = tn.id and x.listing_id = lf.listing_id
      where tn.domain = 'style' and tn.slug = fv.slug
    );
  if unmigrated > 0 then
    raise exception 'ABORT: % design-style assignment(s) have no style-taxonomy equivalent', unmigrated;
  end if;
end $$;

-- ── STEP 2. Re-point the 4 search synonyms ──────────────────────────────────
--
-- search_synonyms already supports taxonomy_node_id (26 of 32 rows use it), so
-- these move rather than die. Without this they cascade away in step 4.
--
--   term            was -> facet value      now -> style node
--   -------------      ------------------      ----------------
--   'mid-century'      mid-century-modern      mid-century-modern
--   'scandi'           scandinavian            scandinavian
--   'wabi-sabi'        japanese                japanese
--   'modern'           contemporary            ⚠️ see below
--
-- ⚠️ 'modern' is the one that cannot be carried over mechanically. It pointed at
-- `contemporary` because the live facet had no Modern value. Phase 6 §D creates
-- Modern and Contemporary as DISTINCT styles, so preserving the old target
-- would make the search term 'modern' resolve to Contemporary while a real
-- Modern node sits unused. Re-pointed to `modern`, which is what a user typing
-- "modern" now means. FLAGGED: this is a behaviour change to search, not a
-- mechanical move.
-- 2a. The three mechanical moves (same slug on both sides).
--     Split from 'modern' because an UPDATE ... FROM cannot reference the update
--     target alias inside a join condition — a CASE on ss.term there fails with
--     42P01. Two statements are also clearer about which move is mechanical and
--     which is a deliberate re-target.
update public.search_synonyms ss
set taxonomy_node_id = tn.id, facet_value_id = null
from public.facet_values fv
join public.facets f on f.id = fv.facet_id
join public.taxonomy_nodes tn on tn.domain = 'style' and tn.slug = fv.slug
where ss.facet_value_id = fv.id
  and f.slug = 'design-style'
  and ss.term <> 'modern';

-- 2b. 'modern' — deliberate re-target from contemporary to the new modern node.
update public.search_synonyms ss
set taxonomy_node_id = tn.id, facet_value_id = null
from public.taxonomy_nodes tn
where tn.domain = 'style'
  and tn.slug = 'modern'
  and ss.term = 'modern'
  and ss.facet_value_id in (
    select fv.id from public.facet_values fv
    join public.facets f on f.id = fv.facet_id
    where f.slug = 'design-style'
  );

-- ── STEP 3. Verify before destroying ────────────────────────────────────────
do $$
declare style_assign int; syn_moved int; syn_left int;
begin
  select count(*) into style_assign
  from public.listing_taxonomy_node x
  join public.taxonomy_nodes tn on tn.id = x.taxonomy_node_id
  where tn.domain = 'style';

  select count(*) into syn_moved
  from public.search_synonyms ss
  join public.taxonomy_nodes tn on tn.id = ss.taxonomy_node_id
  where tn.domain = 'style';

  select count(*) into syn_left
  from public.search_synonyms ss
  join public.facet_values fv on fv.id = ss.facet_value_id
  join public.facets f on f.id = fv.facet_id
  where f.slug = 'design-style';

  if style_assign <> 24 then
    raise exception 'ABORT: expected 24 style assignments, found %', style_assign;
  end if;
  if syn_moved <> 4 then
    raise exception 'ABORT: expected 4 re-pointed synonyms, found %', syn_moved;
  end if;
  if syn_left <> 0 then
    raise exception 'ABORT: % synonym(s) still reference design-style facet values', syn_left;
  end if;
end $$;

-- ── STEP 4. Retire the design-style facet (DESTRUCTIVE) ─────────────────────
-- Cascades to its 12 facet_values and their 24 listing_facets. Both are now
-- represented in listing_taxonomy_node (step 1) and archive_snapshots (step 0).
delete from public.facets where slug = 'design-style';

-- ============================================================================
-- room-type: RETIREMENT DELIBERATELY NOT INCLUDED
-- ============================================================================
-- Retiring room-type was approved, but doing it here would contradict the
-- decision made in the same breath. `listing_facets` cascades from
-- `facet_values`, so `delete from facets where slug='room-type'` would DESTROY
-- its single assignment —
--
--   listing  : atlante-wood-outdoor-daybed  (product)
--   value    : room-type/outdoor
--
-- — which is exactly the assignment folded into the deferred D-7 batch (now 11
-- items) for human review. Destroying it is not the same as deferring it.
--
-- Also deliberate, and recorded here rather than left implicit: three room-type
-- values have NO destination in Phase 6 §B at any granularity —
--
--   commercial-space   too coarse; §B has no whole-building space value
--   public-space       too coarse; same
--   other             a catch-all; §B has none by design
--
-- All three carry ZERO assignments. Discarding them is an APPROVED SCOPE
-- DECISION, not an oversight: Phase 6 §B is intentionally finer-grained than
-- the live facet, and a coarse "commercial space" value would re-introduce the
-- Project-Type-inside-Space-Type conflation that §B's exclusion rule forbids.
--
-- The room-type retirement therefore runs as its own migration AFTER D-7
-- resolves the one assignment. Sequencing it that way means no approved
-- decision has to be walked back.
-- ============================================================================

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Steps 1–2 are reversible in place:
--   delete from public.listing_taxonomy_node
--   where taxonomy_node_id in (select id from public.taxonomy_nodes where domain='style');
--   -- then restore search_synonyms from archive_snapshots.search_synonyms_20260728
--
-- Step 4 is NOT reversible in place — the facet rows are gone. Restore from
-- archive_snapshots.facets_20260728 / facet_values_20260728 /
-- listing_facets_20260728, which is why step 0 runs first. Pro Plan PITR (7-day)
-- is the second line of defence.
