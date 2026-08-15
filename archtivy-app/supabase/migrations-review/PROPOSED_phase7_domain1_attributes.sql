-- ============================================================================
-- REVIEW COPY — NOT APPLIED.
--
-- Phase 7, Domain 1 (Furniture): Attribute Definitions + Bindings.
--
-- Contents:
--   Part A  DDL — attribute_definitions, attribute_bindings  (⚠️ see A.0)
--   Part B  31 Attribute Definition rows
--   Part C  38 Attribute Binding rows
--   Part D  Verification queries
--   Part E  Rollback
--
-- NOTHING IS MIGRATED HERE. The color-family / finish-texture facet migrations
-- and the products.color* migration are deliberately NOT in this file — they
-- are destructive and belong in their own reviewable step, exactly as the
-- taxonomy facet retirements were separated from their node inserts.
-- ============================================================================


-- ============================================================================
-- ⚠️ A.0 — READ BEFORE REVIEWING
-- ============================================================================
-- 1. NO PHASE 7 DOCUMENT EXISTS IN THIS REPO. Searched *phase7*, *phase_7*,
--    *attribute* — nothing. The table shapes below are derived from the field
--    list in the task brief. If the real Phase 7 spec differs, this DDL is
--    wrong and the rows will need reshaping. This is the single largest risk
--    in this file.
--
-- 2. THE ATTRIBUTE TABLES DO NOT EXIST YET. Verified against production:
--    no table matching %attribute%, %attr% or %binding%. So this is not
--    "definition rows" — it is schema creation plus rows.
--
-- 3. "BIND AT PRODUCT ROOT" HAS NO SINGLE NODE. domain='product' has 12 roots
--    (furniture, lighting, …). Universal attributes are therefore modelled as
--    taxonomy_node_id IS NULL = applies to every product node. If Phase 7
--    intends a different representation, change it here first.
--
-- 4. PROVISIONAL CHOICES. Flags A, B, C, D, F(Beds), I from the proposal were
--    not answered. Each place where that forced a choice is marked
--    « PROVISIONAL — flag X ». They are defensible defaults, not decisions.
--
-- 5. EVIDENCE PROVENANCE. Every definition carries an `evidence` comment
--    stating whether it rests on LOCAL data (measured against the 33 live
--    Furniture listings) or on COMPETITOR benchmarking supplied by the product
--    owner. Four attributes have zero or near-zero local support and exist
--    solely on competitor consensus — they are labelled COMPETITOR-ONLY so a
--    future reader does not mistake them for data-driven.
-- ============================================================================


-- ── PART A. DDL ─────────────────────────────────────────────────────────────

create table if not exists public.attribute_definitions (
  id                   uuid primary key default gen_random_uuid(),
  attribute_key        text not null unique,
  label                text not null,
  description          text,

  data_type            text not null check (data_type in (
                         'enum','multi_enum','number','number_range','boolean',
                         'text','date','dimension','color_ref','entity_ref',
                         'multi_entity_ref')),
  unit_type            text,

  -- enum / multi_enum vocabulary. Bindings may narrow it, never widen it.
  allowed_values       text[] not null default '{}',

  -- For entity_ref / multi_entity_ref: what this points at. Free text rather
  -- than an FK because targets are heterogeneous (profiles, taxonomy_nodes
  -- filtered by domain, materials).
  entity_target        text,

  validation_rule      jsonb,
  is_derived           boolean not null default false,
  derivation_rule      text,
  ai_extractable       boolean not null default false,
  facet_eligible       boolean not null default false,
  seo_landing_eligible boolean not null default false,
  editable_by          text[] not null default '{admin}',

  sort_order           integer not null default 0,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- A derived attribute without a rule is a silent no-op.
  constraint attribute_definitions_derived_rule_ck
    check (not is_derived or derivation_rule is not null),
  -- An enum with no vocabulary cannot validate anything.
  constraint attribute_definitions_enum_values_ck
    check (data_type not in ('enum','multi_enum') or cardinality(allowed_values) > 0),
  -- An entity_ref with no target cannot resolve.
  constraint attribute_definitions_entity_target_ck
    check (data_type not in ('entity_ref','multi_entity_ref') or entity_target is not null)
);

comment on table public.attribute_definitions is
  'Phase 7 Attribute Definitions. One row per attribute concept, independent of where it binds.';
comment on column public.attribute_definitions.entity_target is
  'Target for entity_ref/multi_entity_ref, e.g. profile, taxonomy_node:material, material.';

create table if not exists public.attribute_bindings (
  id                      uuid primary key default gen_random_uuid(),
  attribute_id            uuid not null
                            references public.attribute_definitions(id) on delete cascade,

  -- NULL = universal: applies to every product node. See A.0 note 3.
  taxonomy_node_id        uuid references public.taxonomy_nodes(id) on delete cascade,

  is_required             boolean not null default false,
  allowed_values_override text[],
  default_value           text,
  excluded                boolean not null default false,
  exclusion_reason        text,
  conditional_requirement jsonb,

  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),

  -- An exclusion without a reason is indistinguishable from an oversight.
  constraint attribute_bindings_exclusion_ck
    check (not excluded or exclusion_reason is not null),
  -- Excluding and requiring the same attribute is contradictory.
  constraint attribute_bindings_excluded_not_required_ck
    check (not (excluded and is_required))
);

-- Partial unique indexes: a NULL taxonomy_node_id would defeat a plain UNIQUE,
-- so universal and node-scoped bindings are constrained separately.
create unique index if not exists attribute_bindings_universal_uq
  on public.attribute_bindings (attribute_id)
  where taxonomy_node_id is null;

create unique index if not exists attribute_bindings_node_uq
  on public.attribute_bindings (attribute_id, taxonomy_node_id)
  where taxonomy_node_id is not null;

create index if not exists idx_attribute_bindings_node
  on public.attribute_bindings (taxonomy_node_id);

-- RLS: deny-by-default, matching the posture applied to site_settings and
-- promotion_campaigns in 2331cb8. Clerk is the auth provider, so auth.uid() is
-- always NULL for app users and no permissive policy is written here. Server
-- code reads via the service role, which bypasses RLS.
alter table public.attribute_definitions enable row level security;
alter table public.attribute_bindings    enable row level security;


-- ── PART B. ATTRIBUTE DEFINITIONS (31) ──────────────────────────────────────
--
-- evidence codes:
--   LOCAL n/m   measured against the 33 live Furniture listings
--   COMPETITOR  cross-site benchmarking supplied by the product owner
--   FORWARD     standard commercial expectation, no local support, cannot be
--               backfilled — populated only by future data entry

insert into public.attribute_definitions
  (attribute_key, label, description, data_type, unit_type, allowed_values,
   entity_target, ai_extractable, facet_eligible, seo_landing_eligible,
   editable_by, sort_order)
values
-- ── UNIVERSAL (bind at product root) ───────────────────────────────────────
('brand', 'Brand',
 'Manufacturer or brand. RELATIONSHIP, not a text field. evidence: LOCAL — brand_profile_id exists but is NULL on 33/33; brand named in prose on ~all.',
 'entity_ref', null, '{}', 'profile', true, true, true, '{admin,owner}', 10),

('designers', 'Designer(s)',
 'Designer(s) credited. RELATIONSHIP. Role vocabulary lives in taxonomy_nodes(domain=professional_role). evidence: LOCAL 19/33 "designed by"; team_members jsonb empty 33/33.',
 'multi_entity_ref', null, '{}', 'profile', true, true, true, '{admin,owner}', 20),

('materials', 'Materials',
 'Materials present. evidence: LOCAL 18/33 via product_material_links (Leather 9, Wood 6, Steel 5, Fabric 4, Marble 2). NOTE: two competing stores exist — materials table (92 rows) and taxonomy_nodes(domain=material) (204 nodes / 95 assignments). Target below is PROVISIONAL — flag A/K.',
 'multi_entity_ref', null, '{}', 'taxonomy_node:material', true, true, true, '{admin,owner}', 30),

('color_family', 'Colour family',
 'Colour grouping. Supersedes the color-family facet. evidence: LOCAL 12 Furniture / 64 platform facet assignments + products.color(2). « PROVISIONAL — flag B »: modelled as multi_enum, NOT color_ref, because no colour entity table exists.',
 'multi_enum', null,
 '{black,blue,bronze,brown,copper,gold,gray,green,natural,orange,pink,purple,red,silver,white,wood,yellow,other}',
 null, true, true, true, '{admin,owner}', 40),

('finish', 'Finish / texture',
 'Surface finish. Supersedes the finish-texture facet. evidence: LOCAL 1 Furniture / 14 platform facet assignments; prose "coffee oak finish", "painted steel".',
 'enum', null,
 '{matte,glossy,satin,brushed,polished,textured,lacquered,oiled,stained,veneered,raw}',
 null, true, true, false, '{admin,owner}', 50),

('country_of_origin', 'Country of origin',
 'ISO 3166-1 country of manufacture. evidence: LOCAL 7/33 "made in / manufactured in / produced in".',
 'enum', null, '{ISO_3166_1}', null, true, true, true, '{admin,owner}', 60),

('year_designed', 'Year designed',
 'Year the product was designed. evidence: LOCAL 7/33 in text; products.year NULL 33/33.',
 'number', 'year', '{}', null, true, false, false, '{admin,owner}', 70),

('collection', 'Collection / series',
 'Named collection or series. evidence: LOCAL 20/33 (61%) — strongest unclaimed universal signal. « PROVISIONAL — flag I »: modelled as text. If a Collection gets its own page and members it must be entity_ref instead, which also decides SEO landing eligibility.',
 'text', null, '{}', null, true, true, true, '{admin,owner}', 80),

('dimensions', 'Dimensions (W×D×H)',
 'Overall dimensions. evidence: FORWARD — LOCAL only 2/33 in text. Cannot be backfilled. « PROVISIONAL — flag D ».',
 'dimension', 'mm', '{}', null, false, false, false, '{admin,owner}', 90),

('bim_cad_available', 'BIM / CAD available',
 'Downloadable technical files. evidence: FORWARD — LOCAL 0/33 in text, documents jsonb empty 33/33. « PROVISIONAL — flag D ».',
 'multi_enum', null, '{revit,ifc,dwg,dxf,sketchup,3ds,obj,step}', null, false, true, false, '{admin}', 100),

-- ── FURNITURE DOMAIN LEVEL (bind at furniture) ─────────────────────────────
('is_upholstered', 'Upholstered',
 'Whether the piece has upholstered surfaces. evidence: LOCAL 23/33 (Seating 20/23, Beds 2/2, Tables 1/7).',
 'boolean', null, '{}', null, true, true, false, '{admin,owner}', 110),

('upholstery_material', 'Upholstery material',
 'Covering material. Conditional on is_upholstered. evidence: LOCAL leather 20/33, fabric 17/33. « PROVISIONAL — flag A »: kept separate from materials/frame_material rather than modelled as a role-qualified material.',
 'enum', null, '{leather,fabric,boucle,velvet,linen,wool,mesh,faux_leather,none}',
 null, true, true, true, '{admin,owner}', 120),

('frame_material', 'Frame / structure material',
 'Structural material, distinct from covering. evidence: LOCAL prose "solid ash wood… painted steel"; metal 10/33, wood 6/33. « PROVISIONAL — flag A ».',
 'multi_entity_ref', null, '{}', 'taxonomy_node:material', true, true, false, '{admin,owner}', 130),

('base_type', 'Base / leg type',
 'How the piece meets the floor. evidence: LOCAL 14/33 (Seating 9/23, Tables 5/7) + COMPETITOR multi-family consensus. Domain level per decision.',
 'enum', null, '{legs,pedestal,sled,swivel_base,plinth,castors,cantilever,trestle,floating}',
 null, true, true, false, '{admin,owner}', 140),

('shape', 'Shape',
 'Overall plan shape. evidence: LOCAL 20/33 (Tables 5/7, Seating 12/23) + COMPETITOR multi-family consensus. Moved from Tables to domain level per decision.',
 'enum', null, '{round,rectangular,square,oval,l_shaped,u_shaped,curved,freeform,modular}',
 null, true, true, true, '{admin,owner}', 150),

('is_modular', 'Modular',
 'Composed of combinable units. evidence: LOCAL 10/33, ALL in Seating, 0 elsewhere. Bound at domain level (Seating + Storage) on COMPETITOR cross-site consensus, despite Storage having zero live listings. Local data alone would place this at Seating.',
 'boolean', null, '{}', null, true, true, true, '{admin,owner}', 160),

('extras', 'Extras / features',
 'Secondary features. Vocabulary is deliberately broad here and NARROWED per family via allowed_values_override. evidence: COMPETITOR. Overlap risk with dedicated attributes is managed by the overrides — see Part C.',
 'multi_enum', null,
 '{headrest,lumbar_support,swivel,castors,integrated_power,usb_charging,cable_management,under_seat_storage,soft_close,push_to_open,adjustable_shelves,anti_tip,extension_leaf_storage,storage_base,tray_top,nesting}',
 null, true, true, false, '{admin,owner}', 170),

-- ── SEATING FAMILY ─────────────────────────────────────────────────────────
('cushion_fill', 'Cushion fill',
 'Filling material/grade. evidence: LOCAL 22/23 Seating (96%) — the strongest Furniture-specific signal in the dataset.',
 'enum', null, '{hr_foam,polyurethane_foam,goose_down,feather,fibre,latex,hybrid,none}',
 null, true, true, false, '{admin,owner}', 200),

('has_armrests', 'Armrests',
 'Presence of armrests. evidence: LOCAL 9/23 Seating + titles ("…with Armrests").',
 'boolean', null, '{}', null, true, true, false, '{admin,owner}', 210),

('seat_capacity', 'Seat capacity',
 'Number of seats. evidence: LOCAL only 2/23 explicit, but trivially extractable from titles ("Dwell 3-Seater"). « flag H »: optional, not required.',
 'number', 'persons', '{}', null, true, true, true, '{admin,owner}', 220),

('configuration', 'Configuration',
 'Arrangement of a modular or sectional piece. evidence: LOCAL explicit in DS-707 ("sectional, linear, serpentine"); co-occurs with is_modular.',
 'multi_enum', null, '{sectional,linear,serpentine,corner,chaise,island,curved,single_unit}',
 null, true, true, true, '{admin,owner}', 230),

('seat_backrest_features', 'Seat & backrest features',
 'Adjustability of seat and back. evidence: COMPETITOR; LOCAL partial support via reclining 2/23 and "adjustable backrest" prose.',
 'multi_enum', null,
 '{fixed,adjustable_backrest,reclining,tilt,high_back,low_back,headrest_integrated,lumbar_adjust,tension_adjust}',
 null, true, true, false, '{admin,owner}', 240),

('is_reclining', 'Reclining',
 'Reclines. evidence: LOCAL 2/23 + title ("A.B.C. Reclining Armchair"). NOTE: overlaps seat_backrest_features.reclining — see flag L.',
 'boolean', null, '{}', null, true, false, false, '{admin,owner}', 250),

('is_convertible', 'Convertible',
 'Converts to another function, e.g. sofa bed or daybed. evidence: COMPETITOR-ONLY — LOCAL 0/23.',
 'boolean', null, '{}', null, true, true, true, '{admin,owner}', 260),

('has_removable_cover', 'Removable cover',
 'Cover can be removed for cleaning/replacement. evidence: LOCAL 2/33 but explicit ("premium removable fabrics").',
 'boolean', null, '{}', null, true, true, false, '{admin,owner}', 270),

-- ── TABLES FAMILY ──────────────────────────────────────────────────────────
('tabletop_material', 'Tabletop material',
 'Top surface material, distinct from frame. evidence: LOCAL — timber, leather, marble/stone named across the 7 Tables listings.',
 'multi_entity_ref', null, '{}', 'taxonomy_node:material', true, true, true, '{admin,owner}', 300),

('is_extendable', 'Extendable',
 'Top extends via leaf or mechanism. evidence: COMPETITOR-ONLY — LOCAL 0/7. My evidence-based recommendation was to EXCLUDE this; included per decision on three-site consensus, as optional + ai_extractable. Recorded so the basis is not lost.',
 'boolean', null, '{}', null, true, true, true, '{admin,owner}', 310),

('height_type', 'Height type',
 'Functional height class. evidence: COMPETITOR; LOCAL implicit — the Tables subtypes (coffee/console/dining/side) already imply height, see flag M.',
 'enum', null, '{coffee,side,dining,counter,bar,console,desk,adjustable}',
 null, true, true, true, '{admin,owner}', 320),

-- ── STORAGE FAMILY ─────────────────────────────────────────────────────────
-- ⚠️ ALL THREE ARE COMPETITOR-ONLY. furniture/storage has ZERO live listings,
--    so none of these can be validated, populated or tested against real data
--    until the family is catalogued. See flag F.
('door_drawer_type', 'Door / drawer type',
 'Opening mechanism. evidence: COMPETITOR-ONLY — furniture/storage has 0 live listings.',
 'multi_enum', null,
 '{hinged_door,sliding_door,folding_door,glass_door,open_shelf,drawer,soft_close_drawer,flap_door,roller_shutter}',
 null, true, true, true, '{admin,owner}', 400),

('installation_type', 'Installation type',
 'How the unit is installed. evidence: COMPETITOR-ONLY — 0 live listings.',
 'enum', null, '{freestanding,wall_mounted,built_in,floor_to_ceiling,modular_system}',
 null, true, true, true, '{admin,owner}', 410),

('has_integrated_lighting', 'Integrated lighting',
 'Built-in lighting. evidence: COMPETITOR-ONLY — 0 live listings. NOTE: Lighting is Domain 5; this is a storage feature, not a lighting product classification.',
 'boolean', null, '{}', null, true, true, false, '{admin,owner}', 420)

on conflict (attribute_key) do nothing;


-- ── PART C. ATTRIBUTE BINDINGS (38) ─────────────────────────────────────────

-- C.1 Universal — taxonomy_node_id IS NULL (every product node).
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, sort_order)
select d.id, null, v.req, v.ord
from (values
  ('brand',             true,  10),   -- the only required universal
  ('designers',         false, 20),
  ('materials',         false, 30),
  ('color_family',      false, 40),
  ('finish',            false, 50),
  ('country_of_origin', false, 60),
  ('year_designed',     false, 70),
  ('collection',        false, 80),
  ('dimensions',        false, 90),
  ('bim_cad_available', false, 100)
) as v(k, req, ord)
join public.attribute_definitions d on d.attribute_key = v.k
where not exists (
  select 1 from public.attribute_bindings b
  where b.attribute_id = d.id and b.taxonomy_node_id is null
);

-- C.2 Furniture domain level.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, sort_order)
select d.id, n.id, v.req, v.ord
from (values
  ('is_upholstered', false, 110),
  ('frame_material', false, 130),
  ('base_type',      false, 140),
  ('shape',          false, 150),
  ('is_modular',     false, 160),
  ('extras',         false, 170)
) as v(k, req, ord)
join public.attribute_definitions d on d.attribute_key = v.k
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture'
where not exists (
  select 1 from public.attribute_bindings b
  where b.attribute_id = d.id and b.taxonomy_node_id = n.id
);

-- upholstery_material: conditional, required only when is_upholstered is true.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, conditional_requirement, sort_order)
select d.id, n.id, false,
  '{"required_when": {"attribute_key": "is_upholstered", "equals": true}}'::jsonb, 120
from public.attribute_definitions d
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture'
where d.attribute_key='upholstery_material'
  and not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- C.3 Seating family.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, sort_order)
select d.id, n.id, false, v.ord
from (values
  ('cushion_fill',           200),
  ('has_armrests',           210),
  ('seat_capacity',          220),
  ('configuration',          230),
  ('seat_backrest_features', 240),
  ('is_reclining',           250),
  ('is_convertible',         260),
  ('has_removable_cover',    270)
) as v(k, ord)
join public.attribute_definitions d on d.attribute_key = v.k
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/seating'
where not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- extras narrowed for Seating. Excludes soft_close / push_to_open /
-- adjustable_shelves (storage-only) and extension_leaf_storage (tables-only).
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, allowed_values_override, sort_order)
select d.id, n.id,
  '{headrest,lumbar_support,swivel,castors,integrated_power,usb_charging,under_seat_storage,storage_base}'::text[],
  171
from public.attribute_definitions d
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/seating'
where d.attribute_key='extras'
  and not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- C.4 Tables family.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, sort_order)
select d.id, n.id, false, v.ord
from (values
  ('tabletop_material', 300),
  ('is_extendable',     310),
  ('height_type',       320)
) as v(k, ord)
join public.attribute_definitions d on d.attribute_key = v.k
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/tables'
where not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, allowed_values_override, sort_order)
select d.id, n.id,
  '{cable_management,integrated_power,extension_leaf_storage,nesting,tray_top}'::text[], 172
from public.attribute_definitions d
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/tables'
where d.attribute_key='extras'
  and not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- Seating-only attributes are explicitly EXCLUDED at Tables rather than left
-- to inheritance ambiguity. is_upholstered stays available (1/7 Tables
-- listings mention upholstery), so it is deliberately not excluded.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, excluded, exclusion_reason, sort_order)
select d.id, n.id, true,
  'Seating-specific; no Tables listing supports it (0/7 measured).', 390
from (values ('cushion_fill'),('has_armrests'),('seat_capacity'),('configuration')) as v(k)
join public.attribute_definitions d on d.attribute_key=v.k
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/tables'
where not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- C.5 Storage family. ⚠️ Zero live listings — nothing here can be validated.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, is_required, sort_order)
select d.id, n.id, false, v.ord
from (values
  ('door_drawer_type',        400),
  ('installation_type',       410),
  ('has_integrated_lighting', 420)
) as v(k, ord)
join public.attribute_definitions d on d.attribute_key = v.k
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/storage'
where not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);

-- extras narrowed for Storage. integrated_lighting is intentionally NOT here —
-- it is its own attribute at this family, and duplicating it would create two
-- ways to say the same thing. See flag N.
insert into public.attribute_bindings
  (attribute_id, taxonomy_node_id, allowed_values_override, sort_order)
select d.id, n.id,
  '{soft_close,push_to_open,adjustable_shelves,anti_tip,castors,integrated_power}'::text[], 173
from public.attribute_definitions d
join public.taxonomy_nodes n on n.domain='product' and n.slug_path='furniture/storage'
where d.attribute_key='extras'
  and not exists (select 1 from public.attribute_bindings b
                  where b.attribute_id=d.id and b.taxonomy_node_id=n.id);


-- ============================================================================
-- NOT INCLUDED — EXCLUDED BY DESIGN (recorded so the omissions are auditable)
-- ============================================================================
--   Price / commerce-state flags (in stock, on sale, delivery)
--       Archtivy is a specification platform, not a storefront. LOCAL evidence
--       agrees: 0/33 descriptions contain a price or currency symbol.
--   Usage / Room
--       Duplicates taxonomy_nodes(domain='space_type') — 60 nodes created in
--       Phase 6 tranche 2. Modelling it again as an attribute would recreate
--       the exact facets-vs-taxonomy split that Phase 6 resolved.
--   Made.com-style retail filters (Story, Assembly, Pack Size, Offer)
--       Retail merchandising, not specification. LOCAL: assembly 1/33.
--
-- BEDS FAMILY: no attributes defined. furniture/beds-bedroom has 2 listings —
-- not an evidence base — and no competitor decision was supplied for it, unlike
-- Storage. Left deliberately empty rather than guessed. See flag F.
-- ============================================================================


-- ── PART D. VERIFICATION (run after apply) ──────────────────────────────────
-- expect 31 definitions:
--   select count(*) from public.attribute_definitions;
--
-- expect 38 bindings: 10 universal, 7 furniture, 9 seating, 8 tables, 4 storage
--   select coalesce(n.slug_path,'(universal)') as scope, count(*)
--   from public.attribute_bindings b
--   left join public.taxonomy_nodes n on n.id=b.taxonomy_node_id
--   group by 1 order by 2 desc;
--
-- expect 1 required attribute (brand, universal):
--   select d.attribute_key from public.attribute_bindings b
--   join public.attribute_definitions d on d.id=b.attribute_id where b.is_required;
--
-- expect 0 — every override must be a subset of its definition's vocabulary:
--   select d.attribute_key, b.allowed_values_override
--   from public.attribute_bindings b
--   join public.attribute_definitions d on d.id=b.attribute_id
--   where b.allowed_values_override is not null
--     and not (b.allowed_values_override <@ d.allowed_values);
--
-- expect 4 excluded bindings, all with reasons:
--   select d.attribute_key, b.exclusion_reason from public.attribute_bindings b
--   join public.attribute_definitions d on d.id=b.attribute_id where b.excluded;

-- ── PART E. ROLLBACK ────────────────────────────────────────────────────────
-- Fully reversible; nothing outside these two tables is touched and no existing
-- row is read or modified.
--   drop table if exists public.attribute_bindings;
--   drop table if exists public.attribute_definitions;
-- To keep the tables and drop only this content:
--   delete from public.attribute_bindings;
--   delete from public.attribute_definitions;
