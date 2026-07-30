-- ============================================================================
-- Phase 6 tranche 1: the 4 dimensions with no facets-table overlap.
--   discipline          11 nodes  (flat)
--   intervention_type    7 nodes  (flat; 1 deprecated with replaced_by_id)
--   professional_role   27 nodes  (6 families + 21 roles)
--   organization_type   10 nodes  (flat)
--                    = 55 nodes
--
-- REQUIRES 20260728_phase6_taxonomy_dimensions FIRST — the domain CHECK
-- constraint rejects every value below until it is widened, and synonyms /
-- applies_to / replaced_by_id do not exist as columns yet.
--
-- Idempotent: every insert is ON CONFLICT (domain, slug_path) DO NOTHING,
-- matching the live unique constraint taxonomy_nodes_domain_slug_path_key.
-- Safe to re-run.
-- ============================================================================

-- ── DISCIPLINE (Phase 6 §C) — 11 flat nodes ─────────────────────────────────
-- Answers "what professional practice area contributed to this?"
-- Never encodes Project Type: "Landscape Design" (here) coexists with the
-- "Landscape & Urban" Project Type — different questions (Phase 4 §D).
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, synonyms, sort_order)
values
  ('discipline', null, 0, 'architecture', 'architecture', 'Architecture', 'Building design practice', '{}', 0),
  ('discipline', null, 0, 'interior-design', 'interior-design', 'Interior Design', 'Interior space design practice', '{}', 1),
  ('discipline', null, 0, 'landscape-design', 'landscape-design', 'Landscape Design', 'Outdoor/landscape design practice', '{"Landscape Architecture"}', 2),
  ('discipline', null, 0, 'urban-design', 'urban-design', 'Urban Design', 'Masterplan/urban-scale design practice', '{"Urban Planning"}', 3),
  ('discipline', null, 0, 'structural-engineering', 'structural-engineering', 'Structural Engineering', 'Structural systems engineering practice', '{}', 4),
  ('discipline', null, 0, 'mep-engineering', 'mep-engineering', 'MEP Engineering', 'Mechanical, electrical, plumbing systems engineering practice', '{}', 5),
  ('discipline', null, 0, 'lighting-design', 'lighting-design', 'Lighting Design', 'Lighting design practice. Distinct from the Lighting Product Domain (Phase 5 §D) — this is who designed the scheme, not the fixtures.', '{}', 6),
  ('discipline', null, 0, 'acoustic-design', 'acoustic-design', 'Acoustic Design', 'Acoustic engineering/consulting practice', '{}', 7),
  ('discipline', null, 0, 'graphic-branding-design', 'graphic-branding-design', 'Graphic / Branding Design', 'Environmental graphics, signage, and brand identity practice within a project', '{}', 8),
  ('discipline', null, 0, 'sustainability-consulting', 'sustainability-consulting', 'Sustainability Consulting', 'Sustainability strategy and certification consulting practice', '{}', 9),
  ('discipline', null, 0, 'construction-management', 'construction-management', 'Construction Management', 'Construction delivery and project management practice', '{}', 10)
on conflict (domain, slug_path) do nothing;

-- ── INTERVENTION TYPE (Phase 6 §E) — 6 active + 1 deprecated ────────────────
-- Answers "what was done to the building?" Never encodes Project Type — this is
-- the dimension that resolves the ArchDaily "Refurbishment" conflation.
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, synonyms, sort_order)
values
  ('intervention_type', null, 0, 'new-build', 'new-build', 'New Build', 'Construction on a site with no pre-existing structure being retained', '{"New Construction"}', 0),
  ('intervention_type', null, 0, 'renovation', 'renovation', 'Renovation', 'Substantial alteration of an existing structure while retaining its core', '{}', 1),
  ('intervention_type', null, 0, 'extension', 'extension', 'Extension', 'Addition of new built area to an existing structure', '{"Addition"}', 2),
  ('intervention_type', null, 0, 'adaptive-reuse', 'adaptive-reuse', 'Adaptive Reuse', 'Repurposing an existing structure for a use different from its original program', '{"Conversion"}', 3),
  ('intervention_type', null, 0, 'restoration', 'restoration', 'Restoration', 'Work intended to return a structure to a prior historical state', '{}', 4),
  ('intervention_type', null, 0, 'interior-fit-out', 'interior-fit-out', 'Interior Fit-Out', 'Work limited to interior spaces within an existing shell, no structural intervention', '{"Fit-Out"}', 5)
on conflict (domain, slug_path) do nothing;

-- Deprecated node + redirect. Phase 6 §E's worked example, and the first real
-- use of the Phase 3 §I is_replaced_by mechanism. Inserted second so the
-- Renovation target already exists to point at.
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, is_active, replaced_by_id, sort_order)
select
  'intervention_type', null, 0, 'refurbishment', 'refurbishment', 'Refurbishment',
  'DEPRECATED. ArchDaily-derived conflated category identified in Phase 1 §2. Superseded by Renovation.',
  false, r.id, 99
from public.taxonomy_nodes r
where r.domain = 'intervention_type' and r.slug_path = 'renovation'
on conflict (domain, slug_path) do nothing;

-- ── PROFESSIONAL ROLE (Phase 6 §H) — 6 families + 21 roles ──────────────────
-- applies_to = {project_credit}: role is metadata on the Project Credit
-- structured record, NOT a field on Professional or Organization (Phase 2 §1).
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, applies_to, sort_order)
values
  ('professional_role', null, 0, 'design-roles', 'design-roles', 'Design Roles', '{project_credit}', 0),
  ('professional_role', null, 0, 'engineering-roles', 'engineering-roles', 'Engineering Roles', '{project_credit}', 1),
  ('professional_role', null, 0, 'construction-roles', 'construction-roles', 'Construction Roles', '{project_credit}', 2),
  ('professional_role', null, 0, 'consulting-roles', 'consulting-roles', 'Consulting Roles', '{project_credit}', 3),
  ('professional_role', null, 0, 'creative-media-roles', 'creative-media-roles', 'Creative & Media Roles', '{project_credit}', 4),
  ('professional_role', null, 0, 'ownership-development-roles', 'ownership-development-roles', 'Ownership / Development Roles', '{project_credit}', 5)
on conflict (domain, slug_path) do nothing;

insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, synonyms, applies_to, sort_order)
select 'professional_role', p.id, 1, v.slug, p.slug_path || '/' || v.slug, v.label, v.syn::text[], '{project_credit}', v.ord
from public.taxonomy_nodes p
join (values
  -- Design
  ('design-roles','lead-architect','Lead Architect','{}',0),
  ('design-roles','design-architect','Design Architect','{}',1),
  ('design-roles','interior-designer','Interior Designer','{}',2),
  ('design-roles','landscape-architect','Landscape Architect','{}',3),
  ('design-roles','lighting-designer','Lighting Designer','{}',4),
  ('design-roles','urban-designer','Urban Designer','{}',5),
  -- Engineering
  ('engineering-roles','structural-engineer','Structural Engineer','{}',0),
  ('engineering-roles','mep-engineer','MEP Engineer','{}',1),
  ('engineering-roles','civil-engineer','Civil Engineer','{}',2),
  ('engineering-roles','acoustic-engineer','Acoustic Engineer','{}',3),
  -- Construction
  ('construction-roles','general-contractor','General Contractor','{}',0),
  ('construction-roles','construction-manager','Construction Manager','{}',1),
  ('construction-roles','subcontractor','Subcontractor','{}',2),
  -- Consulting
  ('consulting-roles','sustainability-consultant','Sustainability Consultant','{}',0),
  ('consulting-roles','cost-consultant','Cost Consultant','{"Quantity Surveyor"}',1),
  ('consulting-roles','code-consultant','Code Consultant','{}',2),
  -- Creative & Media
  ('creative-media-roles','photographer','Photographer','{}',0),
  ('creative-media-roles','stylist','Stylist','{}',1),
  ('creative-media-roles','graphic-designer','Graphic Designer','{}',2),
  -- Ownership / Development
  ('ownership-development-roles','developer','Developer','{}',0),
  ('ownership-development-roles','owners-representative','Owner''s Representative','{}',1)
) as v(family, slug, label, syn, ord)
  on v.family = p.slug_path
where p.domain = 'professional_role' and p.depth = 0
on conflict (domain, slug_path) do nothing;

-- ── ORGANIZATION TYPE (Phase 6 §I) — 10 flat nodes ──────────────────────────
-- is_manufacturer stays a capability flag on Organization, NOT a value here
-- (Phase 3 §A.3). Manufacturer is deliberately absent.
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, synonyms, applies_to, sort_order)
values
  ('organization_type', null, 0, 'studio', 'studio', 'Studio', 'A design-focused professional firm (architecture, interior design, landscape, etc.)', '{"Firm"}', '{organization}', 0),
  ('organization_type', null, 0, 'developer', 'developer', 'Developer', 'An organization that initiates and finances built-environment projects', '{}', '{organization}', 1),
  ('organization_type', null, 0, 'contractor', 'contractor', 'Contractor', 'An organization that executes construction', '{}', '{organization}', 2),
  ('organization_type', null, 0, 'supplier', 'supplier', 'Supplier', 'An organization that supplies products/materials without necessarily manufacturing them', '{"Distributor"}', '{organization}', 3),
  ('organization_type', null, 0, 'retailer', 'retailer', 'Retailer', 'An organization selling products directly to end consumers', '{}', '{organization}', 4),
  ('organization_type', null, 0, 'trade-association', 'trade-association', 'Trade Association', 'An industry membership/advocacy organization', '{}', '{organization}', 5),
  ('organization_type', null, 0, 'educational-institution', 'educational-institution', 'Educational Institution', 'A school, university, or research institution', '{}', '{organization}', 6),
  ('organization_type', null, 0, 'government-agency', 'government-agency', 'Government Agency', 'A public-sector administrative body', '{}', '{organization}', 7),
  ('organization_type', null, 0, 'media-publication', 'media-publication', 'Media / Publication Organization', 'An editorial or media outlet (also modeled as a Publication entity where the outlet is the primary identity)', '{}', '{organization}', 8),
  ('organization_type', null, 0, 'nonprofit-ngo', 'nonprofit-ngo', 'Nonprofit / NGO', 'A non-commercial mission-driven organization', '{}', '{organization}', 9)
on conflict (domain, slug_path) do nothing;

-- ── VERIFICATION (run after apply) ──────────────────────────────────────────
-- expect: discipline 11 | intervention_type 7 | professional_role 27 | organization_type 10
--
--   select domain, count(*) from public.taxonomy_nodes
--   where domain in ('discipline','intervention_type','professional_role','organization_type')
--   group by domain order by domain;
--
-- expect exactly 1 row, refurbishment -> renovation:
--   select n.slug, n.is_active, r.slug as replaced_by
--   from public.taxonomy_nodes n join public.taxonomy_nodes r on r.id = n.replaced_by_id;
--
-- ROLLBACK:
--   delete from public.taxonomy_nodes
--   where domain in ('discipline','intervention_type','professional_role','organization_type');
-- Nothing references these yet — listing_taxonomy_node has no rows for them
-- until Phase 7/8 wires them up, so the delete is clean.
