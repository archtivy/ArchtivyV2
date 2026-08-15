# Consolidated Taxonomy Cleanup — deferred follow-ups

**Status:** logged, not scheduled. **Nothing here is to be resolved now** — recorded as one
consolidated task per the 2026-07-30 decision so that none of it is silently dropped or
silently actioned.

Surfaced while preparing the D-7 review batch. None blocks the D-7 resolution migration; each
is a pre-existing condition that D-7 made visible. Item 4 is **already resolved** by the D-7
resolution migration and is retained here only so the numbering matches the original list.

---

## 1. Project-root overlap

Four of the 14 `project` roots compete for the same listings:

| Overlap | Competing nodes |
|---|---|
| Office | `commercial/office-building`, `commercial/headquarters`, `commercial/co-working` **vs** `office/corporate-office`, `office/co-working-space`, `office/executive-suite`, `office/creative-studio`, `office/tech-office`, `office/home-office` |
| Retail | `commercial/retail-store`, `commercial/showroom`, `commercial/shopping-mall` **vs** `retail/boutique`, `retail/flagship-store`, `retail/showroom-gallery`, `retail/department-store`, `retail/pop-up-shop`, `retail/kiosk`, `retail/grocery-supermarket` |
| Interior | the whole `interior` root (6 children) — encodes an **Intervention** (fit-out) and a **Space Type**, not a Project Type |
| Intervention-in-Project-Type | `other/renovation-restoration`, `other/adaptive-reuse` — both duplicated by the `intervention_type` dimension created in tranche 1 |

**Why it matters:** D-7 item 9 was placed on `office/corporate-office` while
`commercial/office-building` remains equally valid for the next listing. The choice was
defensible but arbitrary, and the arbitrariness is permanent until the roots are reconciled.

**Made easier by D-7:** after the resolution migration, `project:commercial` (root),
`project:interior/workplace-interior` and `project:other/renovation-restoration` all drop to
**zero assignments** — so the cleanup no longer has to move live data.

## 2. Two competing Outdoor Furniture branches

- `product:outdoor/outdoor-furniture` (Domain 7) — 8 types after D-7 adds Daybed
- `product:furniture/outdoor-furniture` (Domain 1) — 0 types, 0 assignments

D-7 placed all four Flexform pieces in the Domain 7 branch, so Domain 1's is now provably
unused. Retire it or convert it to a redirect.

## 3. Duplicate types inside Domain 7

| Duplicate pair | Paths |
|---|---|
| Lounge | `outdoor/outdoor-furniture/lounge` **and** `.../outdoor-lounge` |
| Planter | `outdoor/outdoor-furniture/planter` **and** `.../planter-bench` **and** `outdoor/garden-landscape/planter` |
| Decking | `outdoor/decking/decking` **and** `outdoor/landscape/decking` |
| Screen | `outdoor/fencing-screens/screen` **and** `outdoor/landscape/screen` |
| Pergola | `outdoor/landscape/pergola` **and** `outdoor/shade-structures/pergola` |

All carry zero assignments, so consolidation is lossless today. That stops being true as soon
as products are filed against them.

Related: sibling `sort_order` under `outdoor/outdoor-furniture` is inconsistent — three types
tied at 0 (`garden-furniture`, `outdoor-seating`, `planter-bench`), then 1, 2, 3, 4. The D-7
migration appends Daybed at 5 without renumbering. Renumbering is part of this cleanup.

## 4. ~~No Daybed type~~ — RESOLVED by the D-7 resolution migration

`product:outdoor/outdoor-furniture/daybed` is created there (decisions 1e + 2e). Listed only to
keep the original numbering stable.

## 5. Listings bundling multiple products under one title

| Listing | Bundles |
|---|---|
| Atlante Wood Outdoor Daybed | **two** models — Atlante Light (aluminium + synthetic mesh) and Atlante Wood (aluminium + hardwood) |
| Pico Outdoor Coffee - Side Table | **two** products — a coffee table and a side table |

Each needs splitting into separate listings before its classification, materials or SEO can be
fully correct. D-7 classified them as single listings because that is what they currently are.

## 6. Missing material assignments

Products naming materials prominently in their descriptions but carrying no `material:*`
assignment:

| Listing | Materials named in text |
|---|---|
| Hamptons Outdoor Daybed | solid iroko wood, aluminium |
| Ortigia Outdoor Armchair | solid iroko wood, die-cast metal alloy, polypropylene cord, PVC |
| Pico Outdoor Coffee - Side Table | aluminium (epoxy powder-coated), solid iroko wood, lava stone, porphyry, Cardoso, Beola Argentata |
| Atlante Wood Outdoor Daybed | cast aluminium, synthetic mesh fibre, hardwood |

For contrast, the project `spark-capital-mercer` does carry `material:wood`. 95 material
assignments exist overall, so the dimension is live — these four are simply unpopulated.

## 7. `other/unbuilt-conceptual` encodes build status as a Project Type

Same category error as `renovation-restoration`: whether a project is built, unbuilt, in
progress or a competition entry is a **status**, orthogonal to what kind of project it is.

Trigger: `vectura-campus-f-stockholm` has `year = 2028` — future-dated, so either unbuilt/in
progress or the `year` column is recording intended completion rather than construction. D-7
classified it on programme (`commercial/mixed-use` + `education/research-facility`) and left
status alone. Decide whether status becomes its own dimension.

## 8. `listings.category` is stale and now contradicts the taxonomy

| Listing | `category` | Taxonomy after D-7 |
|---|---|---|
| Boston Commonwealth Pier | `Commercial` | `commercial/mixed-use` + waterfront + adaptive-reuse |
| Malmö Live | `Commercial` | `cultural/concert-hall` + hotel + convention-center |
| Vectura Campus F | `Commercial` | `commercial/mixed-use` + research-facility |
| VIA Oslo | `Commercial` | `commercial/mixed-use` + adaptive-reuse |
| Spark Capital - Mercer | **NULL** | `office/corporate-office` + 3 supporting dimensions |
| Rua da Rosa Lisbon | `Renovation / Restoration` | `residential/housing-complex` + renovation + restoration |

The D-7 migration deliberately does **not** rewrite this column — doing so silently would hide
the real question, which is whether `listings.category` should be dropped entirely now that
`listing_taxonomy_node` is authoritative. Malmö Live is the clearest case: `Commercial` is
simply wrong for a concert hall.

Check for readers before dropping it — the admin filters and legacy `legacy_project_category`
mappings on `taxonomy_nodes` may still reference it.

---

## Related open items from earlier phases

Recorded elsewhere, repeated here so one document covers the taxonomy backlog:

- **Domain 10** (General Hardware & Fixings) — specified, never created
- **`screen` 3-way slug split** — window screen → D-4, privacy screen → D-1, office screen → D-9
- **Duplicate aggregators** — `fixtures-fittings`, `appliances`, `surfaces-materials`,
  `office-workspace`
- **Phase 6 Material Families 9 → 14** — 5 families identified as omissions
- **112 duplicated product taxonomy slugs** measured in the gap report
- **Only 68 of 1100 nodes carry assignments** (~6%) — the tree is far ahead of the content
- **`projects` table retirement** — dead code, zero callers
- **2 PostgREST-exposed backup tables** — `photo_product_tags_backup_20260216`,
  `tag_backup_20260216`
- **`VALIDATE CONSTRAINT products_id_listings_fkey`** — added `NOT VALID`, 6 orphans blocking
- **3 `slugFromTitle` variants** not unified (`"Serie 47.3"` → `serie-473` vs `serie-47-3`)
- **3 approved listings with `slug IS NULL`**
- **non-www → www is 307, not 308** — Vercel dashboard setting

Non-taxonomy schema and row-level defects are tracked separately in
**`DATA_INTEGRITY_LOG.md`** — currently the missing FKs on `project_material_links` and the
duplicated `Faulkner Architects` profile.
