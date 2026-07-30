-- ============================================================================
-- REVIEW COPY — NOT APPLIED.
--
-- Phase 6 tranche 2: the 3 dimensions that overlap the live facets table.
--   style           16 nodes  (flat)  — 8 shared + 4 live orphans + 4 approved-absent
--   space_type      60 nodes  (11 families + 49 values)
--   sustainability   6 nodes  (flat categories)
--                 = 82 nodes
--
-- REQUIRES 20260728200000_phase6_taxonomy_dimensions (applied 2026-07-28).
-- Creates NODES ONLY. Assignment migration and facet retirement are a separate
-- migration (20260728_phase6_facet_migration) so a content problem and a
-- destructive problem can never share a rollback.
--
-- Idempotent: ON CONFLICT (domain, slug_path) DO NOTHING throughout.
-- ============================================================================

-- ── STYLE (Phase 6 §D + decision 3) — 16 flat nodes ─────────────────────────
-- Cross-cutting: applies to both Project (has_style) and Product, per Phase 1
-- §4.3. Never encodes Material, Product Type, or Project Type.
--
-- Composition, per the "do both" decision:
--   8 shared  — present live AND in Phase 6 §D
--   4 live orphans — live-only values kept because they are legitimate styles
--   4 approved-absent — Phase 6 §D values not present live
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, synonyms, sort_order)
values
  -- shared (8) — live facet slug == taxonomy slug, so migration is a direct map
  ('style', null, 0, 'contemporary', 'contemporary', 'Contemporary', 'Current, evolving design idiom without a fixed historical reference', '{}', 0),
  ('style', null, 0, 'minimalist', 'minimalist', 'Minimalist', 'Design emphasizing reduction, restraint, and absence of ornament', '{}', 1),
  ('style', null, 0, 'mid-century-modern', 'mid-century-modern', 'Mid-Century Modern', 'Design rooted specifically in the 1940s–1960s modernist idiom', '{"MCM","mid-century"}', 2),
  ('style', null, 0, 'scandinavian', 'scandinavian', 'Scandinavian', 'Design rooted in Nordic design tradition emphasizing simplicity and natural materials', '{"Nordic","scandi"}', 3),
  ('style', null, 0, 'industrial', 'industrial', 'Industrial', 'Design drawing on raw, utilitarian, factory-derived materials and forms', '{}', 4),
  ('style', null, 0, 'art-deco', 'art-deco', 'Art Deco', 'Design rooted in the 1920s–1930s decorative geometric idiom', '{}', 5),
  ('style', null, 0, 'traditional', 'traditional', 'Traditional / Classic', 'Design rooted in historical ornamented/classical idioms', '{"Classical","Classic"}', 6),
  ('style', null, 0, 'rustic', 'rustic', 'Rustic / Farmhouse', 'Design emphasizing informal, natural, agrarian-derived aesthetics', '{"Farmhouse"}', 7),
  -- live orphans kept (4) — decision 3: legitimate style values a designer uses
  ('style', null, 0, 'biophilic', 'biophilic', 'Biophilic', 'Design emphasizing connection to nature through planting, daylight, and natural materials', '{}', 8),
  ('style', null, 0, 'brutalist', 'brutalist', 'Brutalist', 'Design emphasizing raw exposed concrete and monumental massing', '{}', 9),
  ('style', null, 0, 'japanese', 'japanese', 'Japanese', 'Design rooted in Japanese spatial and material tradition', '{"wabi-sabi"}', 10),
  ('style', null, 0, 'mediterranean', 'mediterranean', 'Mediterranean', 'Design rooted in southern-European coastal vernacular', '{}', 11),
  -- approved-absent, created (4) — Phase 6 §D values with no live equivalent
  ('style', null, 0, 'modern', 'modern', 'Modern', 'Design rooted in early-to-mid 20th-century modernist principles', '{}', 12),
  ('style', null, 0, 'coastal', 'coastal', 'Coastal', 'Design emphasizing light, airy, seaside-associated aesthetics', '{}', 13),
  ('style', null, 0, 'eclectic', 'eclectic', 'Eclectic', 'Design deliberately mixing multiple stylistic idioms', '{}', 14),
  ('style', null, 0, 'bohemian', 'bohemian', 'Bohemian', 'Design emphasizing layered, informal, globally-eclectic aesthetics', '{"Boho"}', 15)
on conflict (domain, slug_path) do nothing;

-- NOTE on 'modern' vs 'contemporary': Phase 6 §D deliberately keeps both as
-- distinct values. The live facet had only 'contemporary', and the live search
-- synonym 'modern' pointed AT 'contemporary'. Creating a real 'modern' node
-- means that synonym must be re-pointed rather than carried over — handled in
-- the facet-migration migration, not here.

-- ── SPACE TYPE (Phase 6 §B) — 11 families + 49 values ───────────────────────
-- Answers "what functional area or room is this within a project?"
-- Serves BOTH Project (contains_space) and Product (suitable_for) — one
-- taxonomy bridging two entity types, per Phase 1 §3 rule 2. Never forks by
-- Project Type: a hotel bathroom is still "Bathroom".
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, applies_to, sort_order)
values
  ('space_type', null, 0, 'residential-spaces', 'residential-spaces', 'Residential Spaces', '{project,product}', 0),
  ('space_type', null, 0, 'hospitality-spaces', 'hospitality-spaces', 'Hospitality Spaces', '{project,product}', 1),
  ('space_type', null, 0, 'workplace-spaces', 'workplace-spaces', 'Workplace Spaces', '{project,product}', 2),
  ('space_type', null, 0, 'retail-spaces', 'retail-spaces', 'Retail Spaces', '{project,product}', 3),
  ('space_type', null, 0, 'cultural-civic-spaces', 'cultural-civic-spaces', 'Cultural & Civic Spaces', '{project,product}', 4),
  ('space_type', null, 0, 'healthcare-spaces', 'healthcare-spaces', 'Healthcare Spaces', '{project,product}', 5),
  ('space_type', null, 0, 'educational-spaces', 'educational-spaces', 'Educational Spaces', '{project,product}', 6),
  ('space_type', null, 0, 'food-beverage-spaces', 'food-beverage-spaces', 'Food & Beverage Spaces', '{project,product}', 7),
  ('space_type', null, 0, 'wellness-recreation-spaces', 'wellness-recreation-spaces', 'Wellness & Recreation Spaces', '{project,product}', 8),
  ('space_type', null, 0, 'circulation-support-spaces', 'circulation-support-spaces', 'Circulation & Support Spaces', '{project,product}', 9),
  ('space_type', null, 0, 'outdoor-spaces', 'outdoor-spaces', 'Outdoor Spaces', '{project,product}', 10)
on conflict (domain, slug_path) do nothing;

insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, synonyms, applies_to, sort_order)
select 'space_type', p.id, 1, v.slug, p.slug_path || '/' || v.slug, v.label, v.syn::text[], '{project,product}', v.ord
from public.taxonomy_nodes p
join (values
  ('residential-spaces','living-room','Living Room','{"Great Room"}',0),
  ('residential-spaces','bedroom','Bedroom','{}',1),
  ('residential-spaces','kitchen-residential','Kitchen (Residential)','{}',2),
  ('residential-spaces','bathroom-residential','Bathroom (Residential)','{}',3),
  ('residential-spaces','home-office','Home Office','{}',4),
  ('residential-spaces','dining-room','Dining Room','{}',5),
  ('residential-spaces','primary-suite','Primary Suite','{"Master Suite"}',6),

  ('hospitality-spaces','guest-room','Guest Room','{}',0),
  ('hospitality-spaces','suite','Suite','{}',1),
  ('hospitality-spaces','lobby-hospitality','Lobby (Hospitality)','{}',2),
  ('hospitality-spaces','ballroom','Ballroom','{}',3),
  ('hospitality-spaces','banquet-hall','Banquet Hall','{}',4),

  ('workplace-spaces','private-office','Private Office','{}',0),
  ('workplace-spaces','open-office','Open Office','{}',1),
  ('workplace-spaces','conference-room','Conference Room','{"Meeting Room"}',2),
  ('workplace-spaces','reception-workplace','Reception (Workplace)','{}',3),
  ('workplace-spaces','breakout-space','Breakout Space','{}',4),

  ('retail-spaces','sales-floor','Sales Floor','{}',0),
  ('retail-spaces','fitting-room','Fitting Room','{"Changing Room"}',1),
  ('retail-spaces','checkout-area','Checkout Area','{}',2),
  ('retail-spaces','window-display','Window Display','{}',3),

  ('cultural-civic-spaces','gallery-space','Gallery Space','{}',0),
  ('cultural-civic-spaces','auditorium','Auditorium','{}',1),
  ('cultural-civic-spaces','reading-room','Reading Room','{}',2),
  ('cultural-civic-spaces','council-chamber','Council Chamber','{}',3),

  ('healthcare-spaces','patient-room','Patient Room','{}',0),
  ('healthcare-spaces','exam-room','Exam Room','{}',1),
  ('healthcare-spaces','waiting-room','Waiting Room','{}',2),
  ('healthcare-spaces','operating-room','Operating Room','{}',3),

  ('educational-spaces','classroom','Classroom','{}',0),
  ('educational-spaces','lecture-hall','Lecture Hall','{}',1),
  ('educational-spaces','library-space','Library Space','{}',2),
  ('educational-spaces','laboratory-space','Laboratory Space','{}',3),

  ('food-beverage-spaces','dining-area','Dining Area','{}',0),
  ('food-beverage-spaces','bar-area','Bar Area','{}',1),
  ('food-beverage-spaces','commercial-kitchen','Commercial Kitchen','{}',2),

  ('wellness-recreation-spaces','spa-treatment-room','Spa Treatment Room','{}',0),
  ('wellness-recreation-spaces','fitness-studio','Fitness Studio','{}',1),
  ('wellness-recreation-spaces','pool-deck','Pool Deck','{}',2),
  ('wellness-recreation-spaces','locker-room','Locker Room','{}',3),

  ('circulation-support-spaces','corridor','Corridor','{"Hallway"}',0),
  ('circulation-support-spaces','shared-lobby','Shared Lobby','{}',1),
  ('circulation-support-spaces','restroom-public','Restroom (Public)','{}',2),
  ('circulation-support-spaces','back-of-house','Back of House','{"BOH"}',3),
  ('circulation-support-spaces','storage-room','Storage Room','{}',4),

  ('outdoor-spaces','terrace','Terrace','{}',0),
  ('outdoor-spaces','courtyard','Courtyard','{}',1),
  ('outdoor-spaces','rooftop','Rooftop','{}',2),
  ('outdoor-spaces','garden-space','Garden','{}',3)
) as v(family, slug, label, syn, ord)
  on v.family = p.slug_path
where p.domain = 'space_type' and p.depth = 0
on conflict (domain, slug_path) do nothing;

-- NOTE: 'garden-space' is deliberately NOT slugged 'garden'. A Garden Space Type
-- within a project is a different thing from the Landscape & Urban Project Type,
-- and from the live project/landscape-urban/garden node. Phase 6 §B calls this
-- out explicitly. Distinct slugs keep them from being conflated later.

-- ── SUSTAINABILITY (Phase 6 §J) — 6 flat categories ─────────────────────────
-- Classifies Certification Program and Performance Metric ENTITIES into
-- browsable categories. It does NOT create those entities (Phase 6 §A.3 forbids
-- speculative entity creation) and does NOT hold certification names or product
-- attributes.
--
-- ⚠️ This is why the live `sustainability` facet is NOT migrated into these
-- nodes and NOT retired: its values are a mix of specific certification
-- programs (fsc-certified, cradle-to-cradle, energy-star, greenguard) and
-- product attributes (low-voc, biodegradable, recycled-content,
-- locally-sourced). Neither kind is a category. The facet stays a Controlled
-- Attribute alongside finish-texture until Certification Program entities
-- exist. Its 5 assignments are untouched.
insert into public.taxonomy_nodes
  (domain, parent_id, depth, slug, slug_path, label, description, applies_to, sort_order)
values
  ('sustainability', null, 0, 'green-building-certification', 'green-building-certification', 'Green Building Certification', 'Whole-building environmental performance certification (e.g. LEED, BREEAM)', '{certification_program}', 0),
  ('sustainability', null, 0, 'energy-performance-metric', 'energy-performance-metric', 'Energy Performance Metric', 'Metrics quantifying operational energy use (e.g. kWh/m²/yr)', '{performance_metric}', 1),
  ('sustainability', null, 0, 'embodied-carbon-metric', 'embodied-carbon-metric', 'Embodied Carbon Metric', 'Metrics quantifying carbon emitted in materials/construction (e.g. kgCO2e/m²)', '{performance_metric}', 2),
  ('sustainability', null, 0, 'material-health-transparency-certification', 'material-health-transparency-certification', 'Material Health / Transparency Certification', 'Certifications disclosing material composition/health impact (e.g. Declare, Cradle to Cradle)', '{certification_program}', 3),
  ('sustainability', null, 0, 'water-efficiency-metric', 'water-efficiency-metric', 'Water Efficiency Metric', 'Metrics quantifying water use/efficiency', '{performance_metric}', 4),
  ('sustainability', null, 0, 'social-equity-certification', 'social-equity-certification', 'Social / Equity Certification', 'Certifications addressing labor/social equity standards in production (e.g. Fair Trade)', '{certification_program}', 5)
on conflict (domain, slug_path) do nothing;

-- ── VERIFICATION (run after apply) ──────────────────────────────────────────
-- expect: style 16 | space_type 60 (11 d0 + 49 d1) | sustainability 6
--   select domain, count(*) n, count(*) filter (where depth=0) d0, count(*) filter (where depth=1) d1
--   from public.taxonomy_nodes where domain in ('style','space_type','sustainability')
--   group by domain order by domain;
--
-- expect total 1100 nodes (1018 + 82)
--   select count(*) from public.taxonomy_nodes;
--
-- ROLLBACK:
--   delete from public.taxonomy_nodes where domain in ('style','space_type','sustainability');
-- Clean while the facet migration has NOT run. Once assignments point at style
-- nodes, delete those listing_taxonomy_node rows first.
