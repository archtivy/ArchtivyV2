-- ============================================================================
-- Phase 6 prerequisite: widen the taxonomy_nodes domain vocabulary and add the
-- five fields Phase 6 §A.1 specifies as part of the shared Taxonomy Node shape.
--
-- WHY THIS IS REQUIRED BEFORE ANY INSERT:
--   The live CHECK constraint permits only four domain values —
--     CHECK (domain = ANY (ARRAY['product','project','material','style']))
--   Six of the seven Phase 6 dimensions would be rejected with 23514.
--   Verified against production.
--
-- WHY THE COLUMNS:
--   Phase 6 §A.1 defines the node shape as "label, dimension, slug, parent,
--   synonyms, definition, inclusion/exclusion criteria, external taxonomy
--   mapping, has_parent/has_child/is_replaced_by". Five of those have no column.
--   Two are load-bearing for content this phase actually creates:
--     - replaced_by_id : Phase 6 §E deprecates "Refurbishment" -> "Renovation".
--                        Without the column that node cannot be recorded at all.
--     - applies_to     : Phase 6 §H (Professional Role -> Project Credit.role)
--                        and §J (Sustainability -> Certification Program /
--                        Performance Metric) both declare their target via it.
--
-- SAFETY: strictly additive. No existing row is read or modified. All new
-- columns are nullable or defaulted, so the 963 existing rows are unaffected
-- and no backfill is needed. The CHECK is widened, never narrowed — every value
-- valid before remains valid.
-- ============================================================================

-- ── 1. Widen the domain vocabulary ──────────────────────────────────────────
-- Drop-then-add rather than ALTER: Postgres has no "modify check constraint".
-- Both statements are in one migration, so they are one transaction — there is
-- no window where the table is unconstrained.
alter table public.taxonomy_nodes
  drop constraint if exists taxonomy_nodes_domain_check;

alter table public.taxonomy_nodes
  add constraint taxonomy_nodes_domain_check
  check (domain = any (array[
    -- existing, unchanged
    'product', 'project', 'material', 'style',
    -- Phase 6 supporting dimensions
    'space_type', 'discipline', 'intervention_type',
    'professional_role', 'organization_type', 'sustainability'
  ]));

comment on constraint taxonomy_nodes_domain_check on public.taxonomy_nodes is
  'Permitted taxonomy dimensions. Phase 4 = project; Phase 5 = product; Phase 6 = material, style, space_type, discipline, intervention_type, professional_role, organization_type, sustainability. Widen here when a new dimension is approved.';

-- ── 2. Add the Phase 6 §A.1 node fields ─────────────────────────────────────
alter table public.taxonomy_nodes
  add column if not exists synonyms           text[] not null default '{}',
  add column if not exists inclusion_criteria text,
  add column if not exists exclusion_criteria text,
  add column if not exists replaced_by_id     uuid,
  add column if not exists applies_to         text[] not null default '{}';

-- Self-referential FK for is_replaced_by (Phase 3 §I deprecation/redirect).
-- SET NULL on delete matches the existing parent_id behaviour on this table.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'taxonomy_nodes_replaced_by_id_fkey'
  ) then
    alter table public.taxonomy_nodes
      add constraint taxonomy_nodes_replaced_by_id_fkey
      foreign key (replaced_by_id) references public.taxonomy_nodes(id)
      on delete set null;
  end if;
end $$;

comment on column public.taxonomy_nodes.synonyms is
  'Alternative labels for search/synonym resolution. Phase 4/5/6 specify synonyms per node.';
comment on column public.taxonomy_nodes.inclusion_criteria is
  'What belongs in this node. Makes the boundary testable rather than implied.';
comment on column public.taxonomy_nodes.exclusion_criteria is
  'What does NOT belong, and where it goes instead.';
comment on column public.taxonomy_nodes.replaced_by_id is
  'is_replaced_by (Phase 3 §I). Set when a node is deprecated or merged; drives redirect resolution. Must be set whenever is_active = false for a superseded node.';
comment on column public.taxonomy_nodes.applies_to is
  'Which object this dimension governs, e.g. {project_credit} for Professional Role, {certification_program,performance_metric} for Sustainability. Empty means it governs the entity implied by its domain.';

-- ── Partial index for redirect resolution ───────────────────────────────────
create index if not exists idx_taxonomy_nodes_replaced_by
  on public.taxonomy_nodes (replaced_by_id)
  where replaced_by_id is not null;

-- ── NOT DONE HERE ───────────────────────────────────────────────────────────
-- No node is inserted by this migration. Dimension content is a separate,
-- individually reviewable step so that a schema problem and a content problem
-- can never be entangled in one rollback.
--
-- ROLLBACK:
--   drop index if exists idx_taxonomy_nodes_replaced_by;
--   alter table public.taxonomy_nodes
--     drop constraint if exists taxonomy_nodes_replaced_by_id_fkey,
--     drop column if exists applies_to,
--     drop column if exists replaced_by_id,
--     drop column if exists exclusion_criteria,
--     drop column if exists inclusion_criteria,
--     drop column if exists synonyms;
--   alter table public.taxonomy_nodes drop constraint taxonomy_nodes_domain_check;
--   alter table public.taxonomy_nodes add constraint taxonomy_nodes_domain_check
--     check (domain = any (array['product','project','material','style']));
-- Safe only while no row uses a new domain value — narrowing the CHECK with
-- such rows present would fail. Delete those rows first.
