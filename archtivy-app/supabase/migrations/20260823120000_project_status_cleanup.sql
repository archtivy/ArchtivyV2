-- project_status: two cleanups, reviewed together.
--
--   1. Clear the column on every product row. It describes a project's
--      lifecycle; products have product_stage.
--   2. Normalise the surviving project values to lowercase.
--
-- Measured against production before writing (all 168 rows, live and
-- soft-deleted):
--
--   value               project   product   total
--   Completed                40        90     130
--   completed                 8         0       8
--   under_construction        8         0       8
--   concept                   2         0       2
--   (null)                   20         0      20
--
-- The contamination is one-directional: 0 projects carry product_stage, 0
-- carry product_collaboration_status, and 0 products carry
-- project_collaboration_status. Only this column crossed over.
--
-- ── WHY BOTH STATEMENTS BELONG IN ONE MIGRATION ─────────────────────────────
-- They are the same defect seen twice. A bulk seed wrote the literal string
-- 'Completed' across listings without distinguishing type, producing both the
-- wrong case AND the wrong column. Splitting them would apply half a repair
-- and leave the column in a third inconsistent state in between.
--
-- Products are cleared FIRST so the normalisation only ever touches genuine
-- project data.
--
-- ── NO product_stage IS INFERRED ────────────────────────────────────────────
-- 89 of the 90 affected products have no product_stage at all, so clearing
-- project_status leaves them with no lifecycle value. That is intended.
-- 'Completed' is not in the product_stage vocabulary (concept, in_development,
-- prototype, production_ready, in_production, limited_production, custom_made,
-- discontinued) and has no natural equivalent. Writing 'in_production' would
-- turn a bulk-seed artifact into a confident claim about 89 products that
-- nobody has actually made. Absent is honest; wrong is not.
--
-- The single product that has both (product_stage = 'concept') loses nothing:
-- its real lifecycle value is in the right column already and is untouched by
-- the WHERE clause below. No special case needed.
--
-- ── SOFT-DELETED ROWS ARE INCLUDED ──────────────────────────────────────────
-- Deliberately no `deleted_at is null` filter. A soft-deleted listing can be
-- restored, and restoring it should not reintroduce data this migration
-- exists to remove. 12 products and 24 projects are soft-deleted.
--
-- ── updated_at IS NOT TOUCHED ───────────────────────────────────────────────
-- No trigger maintains it (verified: created_at and updated_at diverge freely
-- on existing rows, and the app sets it explicitly on write). This is a data
-- repair, not an authorial edit — bumping updated_at on 130 rows would push
-- them to the top of every "recently updated" ordering and rewrite their
-- lastModified in sitemap.xml, telling search engines 130 listings changed
-- when nothing readers can see did.
--
-- Idempotent: re-running matches nothing, because both WHERE clauses test for
-- the condition being repaired.

do $$
declare
  v_products  bigint;
  v_projects  bigint;
begin
  select count(*) into v_products
    from public.listings
   where type = 'product' and project_status is not null;

  select count(*) into v_projects
    from public.listings
   where type = 'project'
     and project_status is not null
     and project_status <> lower(btrim(project_status));

  raise notice 'before: % product rows to clear, % project rows to normalise',
    v_products, v_projects;

  -- Expected 90 and 40 at time of writing. A wildly different number means the
  -- data moved under us and this migration should be re-reviewed, not run.
  if v_products = 0 and v_projects = 0 then
    raise notice 'nothing to do — already applied';
  end if;
end $$;

-- ── 1. project_status does not belong on a product ──────────────────────────
update public.listings
   set project_status = null
 where type = 'product'
   and project_status is not null;

-- ── 2. Normalise case on the remaining project rows ─────────────────────────
-- lower(btrim(...)) rather than a literal 'completed' swap: it repairs any
-- casing or stray-whitespace variant, including ones not present today, and
-- leaves values that are already correct untouched.
update public.listings
   set project_status = lower(btrim(project_status))
 where type = 'project'
   and project_status is not null
   and project_status <> lower(btrim(project_status));

do $$
declare
  v_bad_product bigint;
  v_bad_case    bigint;
  v_distinct    text;
begin
  select count(*) into v_bad_product
    from public.listings
   where type = 'product' and project_status is not null;

  select count(*) into v_bad_case
    from public.listings
   where project_status is not null
     and project_status <> lower(btrim(project_status));

  if v_bad_product <> 0 or v_bad_case <> 0 then
    raise exception 'cleanup incomplete: % product rows, % mis-cased rows remain',
      v_bad_product, v_bad_case;
  end if;

  select string_agg(distinct project_status, ', ' order by project_status)
    into v_distinct
    from public.listings
   where project_status is not null;

  raise notice 'after: project_status values now = [%]', coalesce(v_distinct, '(none)');
end $$;

-- ── NOT DONE HERE, ON PURPOSE ───────────────────────────────────────────────
-- A constraint would stop this recurring:
--
--   alter table public.listings
--     add constraint listings_project_status_product_check
--     check (type <> 'product' or project_status is null);
--
-- Left out because adding a constraint to a live table is its own decision
-- with its own blast radius, and no code path can currently reintroduce the
-- problem: all four writers of project_status (createProject,
-- updateProjectCanonical, createAdminProjectFull, updateProjectAction) are
-- reachable only for projects. Raised for a separate call rather than folded
-- into a data repair.
