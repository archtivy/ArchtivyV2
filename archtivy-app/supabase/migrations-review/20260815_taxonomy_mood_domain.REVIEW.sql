-- ============================================================================
-- Mood taxonomy domain
--
-- Review copy. NOT APPLIED.
--
-- ── WHY A MIGRATION IS UNAVOIDABLE ──────────────────────────────────────────
-- Mood cannot be authored through the admin UI alone. taxonomy_nodes.domain
-- carries a CHECK constraint listing every permitted value, and 'mood' is not
-- among them. Verified live on 2026-08-15:
--
--   select id, label, domain from taxonomy_nodes where domain = 'mood';  -- 0 rows
--
-- and the constraint, established by 20260728200000_phase6_taxonomy_dimensions,
-- permits exactly: product, project, material, style, space_type, discipline,
-- intervention_type, professional_role, organization_type, sustainability.
--
-- So an insert from the new Add-term form returns 23514 until this runs. That
-- is the whole reason this file exists rather than the terms simply being typed
-- into the admin panel.
--
-- ── WHAT REFERENCES MOOD TODAY ──────────────────────────────────────────────
-- Three places already name it as a known gap, none of which invented data:
--   src/app/api/inspirations/route.ts  — "No mood taxonomy exists yet"
--   src/components/inspiration/InspirationFilters.tsx — Mood absent, no facet
--   src/lib/db/inspirations.ts — "no facet, no taxonomy domain, nothing to query"
-- Applying this closes that gap at the data layer. It does NOT switch on the
-- Inspiration mood filter — nothing is tagged yet, so a filter would return an
-- empty result for every term. That stays deferred until listings carry moods.
--
-- ── COMPANION CODE CHANGE (already written, ships with this) ────────────────
-- src/lib/taxonomy/domains.ts already lists "mood" in TAXONOMY_DOMAINS and in
-- PENDING_TAXONOMY_DOMAINS. On applying this, remove "mood" from
-- PENDING_TAXONOMY_DOMAINS — that array is only there to make the admin surface
-- say "pending migration" instead of surfacing a raw 23514.
-- ============================================================================

begin;

-- ── 1. Widen the domain vocabulary ──────────────────────────────────────────
-- Drop-and-recreate, not an addition: a CHECK cannot be extended in place, so
-- the new constraint must restate every existing value. Found by name because
-- 20260728200000 created it explicitly as taxonomy_nodes_domain_check, but
-- guarded so a rename upstream fails loudly rather than silently dropping
-- nothing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.taxonomy_nodes'::regclass
       and conname = 'taxonomy_nodes_domain_check'
  ) then
    raise exception
      'taxonomy_nodes_domain_check not found — schema differs from the audit; stopping rather than guessing.';
  end if;
end $$;

alter table public.taxonomy_nodes
  drop constraint taxonomy_nodes_domain_check;

alter table public.taxonomy_nodes
  add constraint taxonomy_nodes_domain_check
  check (domain = any (array[
    'product',
    'project',
    'material',
    'style',
    'space_type',
    'discipline',
    'intervention_type',
    'professional_role',
    'organization_type',
    'sustainability',
    'mood'
  ]));

comment on constraint taxonomy_nodes_domain_check on public.taxonomy_nodes is
  'Permitted taxonomy dimensions. Keep in sync with TAXONOMY_DOMAINS in src/lib/taxonomy/domains.ts — adding a value in one place only will either 23514 on insert or make the dimension unreadable.';

-- ── 2. Seed the ten mood terms ──────────────────────────────────────────────
-- Exactly the ten named in the brief, in that order. Flat: every term is depth
-- 0 with no parent, because these are sibling adjectives — "Calm" is not a kind
-- of "Bright". No hierarchy is invented where the vocabulary does not have one.
--
-- sort_order follows the brief's ordering rather than alphabetical, so the
-- authoring surface lists them the way they were specified.
--
-- Idempotent: on conflict do nothing, so a re-run is safe and a partially
-- applied state can be completed rather than needing a manual diff.
insert into public.taxonomy_nodes (domain, parent_id, depth, slug, slug_path, label, sort_order, is_active)
values
  ('mood', null, 0, 'calm',       'calm',       'Calm',       1,  true),
  ('mood', null, 0, 'cozy',       'cozy',       'Cozy',       2,  true),
  ('mood', null, 0, 'dark',       'dark',       'Dark',       3,  true),
  ('mood', null, 0, 'bright',     'bright',     'Bright',     4,  true),
  ('mood', null, 0, 'elegant',    'elegant',    'Elegant',    5,  true),
  ('mood', null, 0, 'organic',    'organic',    'Organic',    6,  true),
  ('mood', null, 0, 'luxury',     'luxury',     'Luxury',     7,  true),
  ('mood', null, 0, 'industrial', 'industrial', 'Industrial', 8,  true),
  ('mood', null, 0, 'minimal',    'minimal',    'Minimal',    9,  true),
  ('mood', null, 0, 'warm',       'warm',       'Warm',       10, true)
on conflict do nothing;

-- NOTE on the one slug collision, deliberately not "fixed":
-- Exactly one of these ten already exists elsewhere — 'industrial', as a STYLE
-- node with slug_path 'industrial'. (Checked all ten against all 1101 rows;
-- calm, cozy, dark, bright, elegant, organic, luxury, minimal and warm are
-- unused.) The collision is correct and intended: a mood named Industrial and a
-- style named Industrial are different claims about a project, and merging them
-- would destroy the distinction the Inspiration spec asked for.
--
-- Safe because neither slug nor slug_path is globally unique. Verified against
-- live data: 140 slug values already repeat across rows, and slug_path already
-- repeats once ('other', in both the product and project domains). Every read
-- path scopes by domain, so there is no ambiguity at query time.

commit;

-- ── Verification ────────────────────────────────────────────────────────────
--   select label, slug, sort_order from public.taxonomy_nodes
--    where domain = 'mood' order by sort_order;
--        -- expect 10 rows: Calm, Cozy, Dark, Bright, Elegant, Organic,
--        --                 Luxury, Industrial, Minimal, Warm
--
--   select count(*) from public.taxonomy_nodes;      -- expect 1101 + 10 = 1111
--
--   -- constraint still rejects nonsense:
--   insert into public.taxonomy_nodes (domain, depth, slug, slug_path, label, sort_order)
--        values ('vibes', 0, 'x', 'x', 'X', 1);      -- expect 23514
--
--   -- style siblings untouched:
--   select domain, count(*) from public.taxonomy_nodes
--    where slug in ('minimal','industrial','organic') group by domain;
