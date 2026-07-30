# Taxonomy Reconciliation — Gap Report

**Date:** 2026-07-28 · **Revised:** 2026-07-28 against amended Phase 5 (Domains 8 & 9 approved)
**Mode:** read-only. No `INSERT`/`UPDATE`/`DELETE` was issued against `taxonomy_nodes` or `listing_taxonomy_node`.
**Approved model:** Phase 4 (Project Taxonomy), Phase 5 (Product Taxonomy — **amended, 9 domains**), Phase 6 (Supporting Taxonomies).
**Live source:** `taxonomy_nodes` (963 rows) + `listing_taxonomy_node` (221 rows), queried directly.

> **Revision note.** The amended Phase 5 resolves the two largest blockers this report raised:
> **Domain 8 — Decor & Accessories** and **Domain 9 — Building Systems / MEP** are now approved.
> Product assignments with no approved home drop from **14 → 1**; total contested assignments
> drop from **27 → 14**. Sections 0, 1, 3.1, 3.6, 6 and 8 are updated. The merge detail for
> Domain 9 raises three new scope questions — see §6 items 4a–4c.

---

## 0. Headline findings

| # | Finding | Impact |
|---|---|---|
| 1 | **Only 3 of the 12 required dimensions exist live.** `taxonomy_nodes.domain` contains exactly `project`, `product`, `material`. Seven supporting dimensions have no rows at all. | Blocks Phase 6 entirely |
| 2 | **Live Product taxonomy is organised on a different axis than the approved model.** 19 live domains (by building trade / room) vs 7 approved (by product universe). This is not a rename exercise. | Largest single gap |
| 3 | ~~14 of 77 product assignments have no home~~ → **RESOLVED to 1 of 77** by amended Phase 5. Decor & Accessories (5) and Building Systems (8) now have approved domains. Only `product/other` (1) remains homeless. | Was the largest gap; now near-closed |
| 4 | **Two live top-level product nodes share the label "Building Systems"** (`building-systems` 13 families, `systems-tech` 7 families), each carrying 4 assignments. Amended Phase 5 §I directs merging them into one Domain 9 — the merge is **not** a clean union, see §3.6. | Pre-existing live duplicate, now with an approved target |
| 5 | **Only 68 of 963 nodes (7%) carry any assignment.** 895 nodes are unused. | Migration risk is concentrated and small |
| 6 | **Material is the closest-aligned dimension** — live has 14 families vs 9 approved; live is a superset, not a conflict. | Low effort |
| 7 | **Sports & Recreation already exists live** with 6 children — contradicting the task file's assumption that it is absent. | Correction to the brief |

**Assignment distribution:** material 95 · product 77 · project 49 = 221.
All 126 `is_primary` assignments are project + product; **all 95 material assignments are non-primary** (material is used as secondary tagging).

---

## 1. Dimension coverage — approved vs live

| Approved dimension | Phase | Live `domain` | Live nodes | Status |
|---|---|---|---|---|
| Project Type | 4 | `project` | 117 (14 d0 / 103 d1) | Exists, restructure needed |
| Product Domain→Family→Type→Subtype (**9 domains** after amendment) | 5 | `product` | 642 (19 / 119 / 504) | Exists, **different axis** |
| Material Family/Type | 6 §F | `material` | 204 (14 / 116 / 74) | Exists, superset |
| Space Type | 6 §B | — | **0** | **Missing entirely** |
| Discipline | 6 §C | — | **0** | **Missing entirely** |
| Style | 6 §D | — | **0** | **Missing entirely** |
| Intervention Type | 6 §E | — | **0** | **Missing entirely** |
| Finish | 6 §G | — (not a taxonomy by design) | 0 nodes | Partially exists as a **facet** — see §4 |
| Professional Role | 6 §H | — | **0** | **Missing entirely** |
| Organization Type | 6 §I | — | **0** | **Missing entirely** |
| Sustainability | 6 §J | — | **0** | **Missing entirely** |

---

## 2. Project Type (Phase 4)

**Approved:** 10 top-level + 48 children = 58 nodes.
**Live:** 14 top-level + 103 children = 117 nodes.
**Project assignments:** 49 across 15 nodes.

### 2.1 Top-level

| Approved node | Live equivalent | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| Residential | `residential` | **Match** | 14 (+ children) | Confirm |
| Hospitality | `hospitality` | **Match** | 1 (+ children) | Confirm |
| Workplace | `office` + parts of `commercial` | **Merge/rename** | 0 / 4 | Create `workplace`; move `office-building`, `co-working` from `commercial` |
| Retail | `retail` + parts of `commercial` | **Merge** | 0 / 4 | Keep `retail`; absorb `commercial/retail-store`, `shopping-mall`, `showroom` |
| Cultural & Civic | `cultural` **+** `public-civic` | **Merge (2→1)** | 1 + 1 | Merge two live tops into one |
| Educational | `education` | **Rename** | 3 | `education` → `educational` |
| Healthcare | `healthcare` | **Match** | 0 | Confirm |
| Industrial & Infrastructure | `infrastructure` | **Rename + absorb** | 0 | Rename; absorb `commercial/warehouse-logistics` |
| Landscape & Urban | `landscape-urban` | **Match** | 0 (children: 2) | Confirm |
| Sports & Recreation | `sports-recreation` | **Match** | 0 | Confirm — **already exists**, contrary to the task brief |
| — | `commercial` | **Orphan (splits 3 ways)** | **4** | Retire after re-pointing; 4 assignments need review |
| — | `interior` | **Orphan — wrong dimension** | 0 (child: 1) | Phase 4 §D places Interior Design in **Discipline**, not Project Type |
| — | `office` | **Orphan (folds into Workplace)** | 0 | Retire after re-pointing |
| — | `other` | **Orphan — wrong dimension** | 0 (child: 1) | Children map to Intervention Type / Status, not Project Type |

### 2.2 Children — matches and renames (abbreviated to nodes with assignments or notable mismatch)

| Approved node | Live equivalent | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| Residential › Single-Family Residence | `residential/single-family-house` | Rename | **15** | Rename slug/label |
| Residential › Multi-Family Residential | `apartment`, `housing-complex`, `townhouse` | **Merge 3→1** | 0 / **3** / 0 | Consolidate; re-point 3 assignments |
| Residential › Affordable / Social Housing | — | **Missing** | — | Create |
| Residential › Co-Living | `residential/co-living` | Match | 0 | Confirm |
| Residential › Senior Living (Independent) | — | **Missing** | — | Create (live `healthcare/elderly-care` is the *clinical* variant → Healthcare) |
| — | `villa`, `penthouse`, `loft-studio`, `micro-unit`, `prefab-house` | **Orphan ×5** | 0 | Not Project Types in approved model — candidates for attributes |
| Hospitality › Hotel | `hotel`, `boutique-hotel` | Merge 2→1 | 0 | Consolidate |
| Hospitality › Restaurant | `restaurant`, `cafe` | Merge 2→1 | 0 / **1** | Consolidate; re-point 1 |
| Hospitality › Bar / Nightlife | `bar-lounge` | Rename | 0 | Rename |
| Hospitality › Serviced / Vacation Rental | — (`hostel` is adjacent, not equivalent) | **Missing** | — | Create; decide `hostel` fate |
| — | `convention-center` | **Orphan** | 0 | No approved home — review |
| Workplace › Office Building | `commercial/office-building` | **Reparent** | **1** | Move under Workplace |
| Workplace › Coworking Space | `office/co-working-space` **and** `commercial/co-working` | **Duplicate live pair** | 0 | Merge into one |
| Retail › Shopping Center / Mall | `commercial/shopping-mall` | Reparent | 0 | Move under Retail |
| Retail › Showroom | `retail/showroom-gallery` **and** `commercial/showroom` | **Duplicate live pair** | 0 | Merge into one |
| Retail › Standard Retail Store | `boutique`, `kiosk`, `pop-up-shop`, `department-store`, `grocery-supermarket`, `commercial/retail-store` | **Merge 6→1** | 0 | Large consolidation — review |
| Cultural&Civic › Museum / Gallery | `museum`, `art-gallery`, `exhibition-space` | Merge 3→1 | 0 | Consolidate |
| Cultural&Civic › Performing Arts Venue | `theater`, `concert-hall` | Merge 2→1 | 0 | Consolidate |
| Cultural&Civic › Government & Administration | `public-civic/government-building` | Rename | 0 | Rename per Phase 4 §C.5 split |
| Cultural&Civic › Justice Facility | `public-civic/courthouse` | Rename | 0 | Rename (Correctional Facility folds in per §C.5) |
| Cultural&Civic › Public Safety Facility | `public-civic/fire-station` | Rename/merge | 0 | Police station absent — create or fold |
| Cultural&Civic › Diplomatic Building | `public-civic/embassy` | Rename | 0 | Rename |
| — | `memorial-monument`, `pavilion`, `cemetery` | **Orphan ×3** | 0 | No approved home — review |
| Educational › Primary / Secondary School | `school`, `kindergarten` | Merge 2→1 | **1** / 0 | Consolidate; re-point 1 |
| Educational › Higher Education | `university` | Rename | 0 | Rename |
| — | `campus-master-plan`, `student-housing` | **Orphan ×2** | 0 | Likely → Landscape&Urban › Masterplan and Residential › Multi-Family |
| Healthcare › Assisted Living / Memory Care | `healthcare/elderly-care` | Rename | 0 | Rename |
| — | `laboratory`, `rehabilitation`, `veterinary-clinic` | **Orphan ×3** | 0 | `laboratory` likely → Educational › Research Facility |
| Ind&Infra › Manufacturing Facility | — | **Missing** | — | Create |
| Ind&Infra › Warehouse / Logistics | `commercial/warehouse-logistics` | Reparent | 0 | Move |
| Ind&Infra › Transit Facility | `airport-terminal`, `train-station`, `metro-station`, `bus-terminal`, `port-marina` | **Merge 5→1** | 0 | Large consolidation — review |
| Ind&Infra › Utility Infrastructure | `power-plant` | Rename/merge | 0 | Rename |
| — | `bridge` | **Orphan** | 0 | No approved home — review |
| Land&Urban › Public Park / Open Space | `park`, `garden`, `playground` | Merge 3→1 | 0 / **1** / 0 | Consolidate; re-point 1 |
| Land&Urban › Plaza / Public Square | `landscape-urban/plaza` | Match | **1** | Confirm |
| Land&Urban › Masterplan | `urban-master-plan` | Rename | 0 | Rename; absorb `campus-master-plan` |
| Land&Urban › Waterfront / Public Realm | `waterfront`, `streetscape` | Merge 2→1 | 0 | Consolidate |
| — | `rooftop-landscape` | **Orphan** | 0 | Likely a Space Type, not a Project Type |
| Sports&Rec › Stadium / Arena | `stadium`, `arena` | Merge 2→1 | 0 | Consolidate |
| Sports&Rec › Aquatic Facility | `swimming-pool` | Rename | 0 | Rename |
| Sports&Rec › Recreation Center | `sports-center` | Rename | 0 | Rename |
| Sports&Rec › Indoor Sports Facility | `climbing-hall` (partial) | **Partial** | 0 | Create proper node |
| Sports&Rec › Outdoor Sports Facility | `tennis-padel` (partial) | **Partial** | 0 | Create proper node |
| Sports&Rec › Sports Club / Training Facility | — | **Missing** | — | Create |

### 2.3 Project assignments requiring a migration path

All 15 project nodes carrying assignments, and whether the approved model gives them a home:

| Live node | Assignments | Approved destination | Risk |
|---|---|---|---|
| `residential/single-family-house` | 15 | Single-Family Residence | Clean rename |
| `residential` (d0 direct) | 14 | Residential | Clean — but d0-direct assignment implies unclassified children |
| `commercial` (d0 direct) | **4** | **Ambiguous** — splits into Workplace / Retail / Ind&Infra | **Needs per-listing review** |
| `education` (d0 direct) | 3 | Educational | Clean rename |
| `residential/housing-complex` | 3 | Multi-Family Residential | Clean merge |
| `commercial/office-building` | 1 | Workplace › Office Building | Reparent |
| `cultural` (d0 direct) | 1 | Cultural & Civic | Clean merge |
| `education/school` | 1 | Primary / Secondary School | Clean |
| `hospitality` (d0 direct) | 1 | Hospitality | Clean |
| `hospitality/cafe` | 1 | Restaurant | Merge |
| `interior/workplace-interior` | 1 | **None** — Interior is a Discipline | **Needs review** |
| `landscape-urban/garden` | 1 | Public Park / Open Space | Merge |
| `landscape-urban/plaza` | 1 | Plaza / Public Square | Clean |
| `other/renovation-restoration` | 1 | **None** — Intervention Type | **Needs review** |
| `public-civic` (d0 direct) | 1 | Cultural & Civic | Clean merge |

**6 of 49 project assignments (12%) need human review**: the 4 on `commercial`, 1 on `interior/workplace-interior`, 1 on `other/renovation-restoration`.

---

## 3. Product Taxonomy (Phase 5)

**Approved:** 7 Domains. Furniture, Lighting, Surfaces & Finishes at full depth; Domains 4–7 at Family level only (Phase 5 §F).
**Live:** 19 top-level "domains", 642 nodes, organised by building trade / room rather than product universe.

> **Discrepancy with the task brief:** the task file states all 7 domains are "built to full Family → Type → Subtype depth." Phase 5 §F explicitly defers Domains 4–7 to Family-level. The gap report below uses the *document*, not the brief.

### 3.1 Live domain → approved domain map

| Live domain | Subtree assignments | Approved home | Classification |
|---|---|---|---|
| `furniture` | **33** | Furniture | **Match** (family names differ) |
| `walls-ceilings-facades` | **9** | Surfaces & Finishes › Wall & Ceiling Finishes | Reparent to Family level |
| `lighting` | **8** | Lighting | **Match** |
| `doors-windows` | **6** | Doors, Windows & Hardware | Match |
| `decor-accessories` | **5** | **NONE** | **No approved home** |
| `building-systems` | **4** | **Excluded by Phase 5 §F/§I** | **Scope conflict** |
| `systems-tech` (dup label) | **4** | **Excluded by Phase 5 §F/§I** | **Scope conflict + duplicate** |
| `outdoor` | **4** | Outdoor & Landscape Products | Match |
| `bathroom` | 1 | Kitchen & Bath Fixtures | Merge |
| `kitchen` | 1 | Kitchen & Bath Fixtures | Merge |
| `textiles` | 1 | Textiles & Soft Furnishings | Match |
| `other` | 1 | **NONE** | Orphan |
| `appliances` | 0 | Kitchen & Bath › Kitchen Appliances | Reparent to Family |
| `fixtures-fittings` | 0 | Kitchen & Bath / Hardware (ambiguous) | **Needs review** |
| `flooring` | 0 | Surfaces & Finishes › Flooring | Reparent to Family |
| `hardware` | 0 | Doors, Windows & Hardware | Reparent to Family |
| `office-workspace` | 0 | Furniture (office subset) | **Needs review** |
| `surfaces-countertops` | 0 | Surfaces & Finishes › Countertop Surfaces | Reparent |
| `surfaces-materials` | 0 | Surfaces & Finishes | **Overlaps `surfaces-countertops` + `flooring`** |

### 3.2 Domain 1 — Furniture (approved full depth)

| Approved node | Live equivalent | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| Furniture (Domain) | `furniture` | Match | 0 direct | Confirm |
| › Seating (Family) | `furniture/seating` | Match | 0 | Confirm |
| ›› Sofa | `seating/sofa` | Match | **9** | Confirm |
| ›› Lounge Chair | `seating/lounge-chair` **+** `seating/armchair` **+** `seating/accent-chair` **+** `seating/chaise-longue` | **Merge 4→1** | 2 + **10** + 0 + 0 | Consolidate; **12 assignments** re-pointed |
| ›› Dining Chair | `seating/dining-chair`, `seating/side-chair` | Merge 2→1 | **2** | Consolidate |
| ›› Office / Task Chair | `seating/office-chair`, `office-furniture/task-chair` | **Duplicate live pair** | 0 | Merge |
| ›› Stool | `seating/stool`, `seating/bar-stool` | Merge 2→1 | 0 | Consolidate |
| ›› Bench | `seating/bench` | Match | 0 | Confirm |
| › Tables (Family) | `furniture/tables` | Match | 0 | Confirm |
| ›› Dining Table | `tables/dining-table` | Match | **3** | Confirm |
| ›› Coffee Table | `tables/coffee-table` | Match | **2** | Confirm |
| ›› Side / End Table | `tables/side-table`, `tables/occasional-table` | Merge 2→1 | **1** | Consolidate |
| ›› Desk | `tables/desk`, `tables/work-table`, `office-furniture/office-desk` | **Merge 3→1** | 0 | Consolidate |
| ›› Console Table | `tables/console-table` | Match | **1** | Confirm |
| › Storage (Family) | `furniture/storage` | Match | 0 | Confirm |
| ›› Cabinet | `storage/cabinet`, `sideboard`, `display-cabinet`, `storage-unit` | Merge 4→1 | 0 | Consolidate |
| ›› Shelving | `storage/shelving`, `storage/bookcase` | Merge 2→1 | 0 | Consolidate |
| ›› Wardrobe / Closet System | `storage/wardrobe` | Rename | 0 | Rename |
| › Bedroom Furniture (Family) | `furniture/beds-bedroom` | Rename | 0 | Rename |
| ›› Bed Frame | `beds-bedroom/bed-frame` | Match | **2** | Confirm |
| ›› Nightstand | `beds-bedroom/nightstand`, `bedside-table` | Merge 2→1 | 0 | Consolidate |
| — | `furniture/outdoor-furniture` (5 children) | **Orphan** | 0 | Approved model puts outdoor furniture in Outdoor & Landscape Products — **cross-domain move** |
| — | `furniture/other-furniture` (5 children) | **Orphan** | **1** | No approved home — review |
| — | `beds-bedroom/dresser`, `headboard`, `vanity` | Orphan ×3 | 0 | Review |
| — | `office-furniture/meeting-table`, `reception-desk`, `office-storage` | Orphan ×3 | 0 | Review |

### 3.3 Domain 2 — Lighting (approved full depth)

| Approved node | Live equivalent | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| Lighting (Domain) | `lighting` | Match | 0 | Confirm |
| › Fixtures (Family) | — (live splits into 6 families by mounting) | **Depth mismatch** | — | Approved has ONE family; live has 6 |
| ›› Pendant Light | `ceiling/pendant`, `linear-strip/linear-pendant` | Merge 2→1 | **6** | Consolidate |
| ›› Chandelier | `ceiling/chandelier` | Match | 0 | Confirm |
| ›› Flush Mount / Semi-Flush | `ceiling/ceiling-fixture` | Rename | 0 | Rename |
| ›› Wall Sconce | `wall/wall-sconce`, `wall/wall-lamp` | Merge 2→1 | 0 | Consolidate |
| ›› Table Lamp | `floor-table/table-lamp`, `desk-lamp`, `task-lamp` | Merge 3→1 | **1** | Consolidate |
| ›› Floor Lamp | `floor-table/floor-lamp` | Match | **1** | Confirm |
| ›› Recessed / Downlight | `ceiling/downlight`, `recessed-light`, `linear-recessed` | Merge 3→1 | 0 | Consolidate |
| ›› Track Lighting | `ceiling/track-lighting` | Match | 0 | Confirm |
| ›› Outdoor Light Fixture | `outdoor-lighting/*` (5 children) | Merge 5→1 | 0 | Consolidate |
| — | `linear-strip/cove-lighting`, `strip-light` | Orphan ×2 | 0 | Review — architectural linear absent from approved |
| — | `other-lighting/emergency-lighting` | **Orphan** | 0 | Phase 5 §D explicitly excludes emergency lighting |
| — | `wall/picture-light`, `wall-washer` | Orphan ×2 | 0 | Review |

### 3.4 Domain 3 — Surfaces & Finishes

**Live splits this across FOUR top-level domains** — `flooring`, `surfaces-countertops`, `surfaces-materials`, `walls-ceilings-facades` — with substantial internal overlap (`surfaces-materials` duplicates flooring, countertops and tiles that also exist elsewhere).

| Approved node | Live equivalent | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| › Flooring › Tile | `flooring/tile-stone-flooring/*`, `surfaces-materials/tiles/*` | **Duplicate across domains** | 0 | Consolidate |
| › Flooring › Wood Flooring | `flooring/wood-flooring`, `surfaces-materials/flooring/wood-flooring` | **Duplicate** | 0 | Consolidate |
| › Flooring › Resilient Flooring | `flooring/resilient-flooring` | Match | 0 | Confirm |
| › Flooring › Carpet / Rug (fitted) | `flooring/carpet-flooring` | Rename | 0 | Rename; keep loose rugs in Textiles (see below) |
| › Wall&Ceiling › Wallcovering | `walls-ceilings-facades/*`, `surfaces-materials/wall-surfaces/wall-covering` | **Duplicate** | (subtree **9**) | Consolidate |
| › Wall&Ceiling › Paint / Coating | — (live has `material/paint-coating`, a *material* not a product) | **Missing as product** | — | Create |
| › Wall&Ceiling › Acoustic Panel | `surfaces-materials/other-surfaces/acoustic-panel` | Match | 0 | Reparent |
| › Countertop Surfaces | `surfaces-countertops/*` (7 families), `surfaces-materials/countertops-worktops` | **Duplicate + depth mismatch** | 0 | Approved has ONE Type; live has 7 families |
| — | `flooring/outdoor-flooring`, `specialty-flooring` | Orphan ×2 | 0 | Review |

**Note:** approved Phase 5 §E places *loose* area rugs in Textiles and *fitted* carpet in Surfaces. Live `textiles/rugs-carpets/area-rug` (**1 assignment**) already matches the approved side of that split — no change needed.

### 3.5 Domains 4–7 (Family-level only in approved model)

| Approved Domain | Approved Families | Live equivalent | Classification |
|---|---|---|---|
| Doors, Windows & Hardware | Doors, Windows, Door/Window Hardware, Skylights | `doors-windows` (5 fam, **6 assign**), `hardware` (6 fam, 0) | **Merge 2 live domains → 1**; live is deeper than approved |
| Kitchen & Bath Fixtures | Sinks & Faucets, Bathing Fixtures, Toilets & Bidets, Kitchen Appliances | `kitchen` (7 fam, **1**), `bathroom` (5 fam, **1**), `appliances` (4 fam, 0) | **Merge 3 live domains → 1**; live is deeper |
| Textiles & Soft Furnishings | Upholstery Fabric, Loose Area Rugs, Drapery & Window Treatments, Cushions & Pillows | `textiles` (7 fam, **1**) | Match; live has extra families (acoustic, bedding-bath) |
| Outdoor & Landscape Products | Planters, Outdoor Shade Structures, Landscape Hardscape | `outdoor` (9 fam, **4**) | Match; live is deeper |

**Consequence:** the approved model is *shallower* than live for Domains 4–7. Reconciling now would mean discarding live depth that already carries assignments, or holding those domains until the Phase 5 follow-up pass fills in Type/Subtype. **Recommend the latter.**

### 3.6 Domains 8 & 9 (approved in amended Phase 5) — live mapping

Both new domains already exist live in substance. Neither needs creating from nothing; both need a
Family → Type → Subtype pass, which amended Phase 5 §I flags as a follow-up.

#### Domain 8 — Decor & Accessories

| Live node | Families | Assignments | Classification |
|---|---|---|---|
| `decor-accessories` | 5 (`clocks`, `cushions-throws`, `decorative-objects`, `mirrors`, `wall-art`) | **5** | **Match** — adopt as Domain 8 |

All 5 assignments sit on `decorative-objects/vase` (the `serie-*` products).

⚠️ **Overlap with Domain 6.** Live `decor-accessories/cushions-throws` (cushion, pillow, throw) duplicates
Phase 5 §F's "Cushions & Pillows" family under **Textiles & Soft Furnishings**. One of the two must own it.
Zero assignments either way, so this is a naming decision, not a migration.

#### Domain 9 — Building Systems / MEP

Two live nodes must merge. The overlap is **partial, not a clean union**:

| Family | In `building-systems` | In `systems-tech` | Note |
|---|---|---|---|
| AV & Media | ✅ (4 types) | ✅ (4 types) | **Identical children** — true duplicate |
| Electrical | `electrical-smart` (9 types) | `electrical` (5) + `home-automation` (4) | Same scope, split differently |
| HVAC | `hvac` (5 types) | `hvac-climate` (9 types, **4 assignments**) | Different children, same concept |
| Plumbing | `plumbing` (drainage, pipework, water-supply, water-treatment) | `plumbing` (boiler, pipe-fitting, valve, water-heater) | **Complementary, not duplicate** — union both |
| Security | `security` (4) | `security-access` (4) | Overlapping |
| Acoustic Systems, Elevator/Lift, Facade Systems, Fire Safety, Insulation & Waterproofing, Partitions, Staircase Systems (**4 assignments**), Structural Systems | ✅ | — | Unique to `building-systems` |
| Laundry Appliances | — | ✅ | **Mis-parented** — belongs to live `appliances` domain, not Building Systems |

**Assignments:** `building-systems/staircase-systems/prefab-staircase` = 4 · `systems-tech/hvac-climate/heating-element` = 4.

⚠️ **Neither of the 8 assignments is unambiguously MEP.** Amended §I names "electrical systems,
plumbing/piping, HVAC equipment, and related building-systems products." `heating-element` is clearly
HVAC. `prefab-staircase` is a building system but **not** MEP — it falls under "related building-systems
products" only on a broad reading. See §6 item 4a.

---

## 4. Supporting Taxonomies (Phase 6)

| Approved dimension | Live nodes | Classification | Assignments | Proposed action |
|---|---|---|---|---|
| **Space Type** (11 families, ~50 values) | 0 | **Missing entirely** | — | Create `domain='space_type'` |
| **Discipline** (11 values) | 0 | **Missing entirely** | — | Create `domain='discipline'`. Note live `project/interior` (1 assignment) belongs here |
| **Style** (12 values) | 0 | **Missing entirely** | — | Create `domain='style'`. Live `facets/design-style` (facet_values) may hold usable values — see below |
| **Intervention Type** (6 values + 1 deprecated) | 0 | **Missing entirely** | — | Create. Live `project/other/renovation-restoration` (1 assignment) and `project/other/adaptive-reuse` belong here |
| **Material Family/Type** | 204 (14 fam / 116 type / 74 d2) | **Superset — closest alignment** | **95** | See §4.1 |
| **Finish** | 0 taxonomy nodes | **By design** — Controlled Attribute, not taxonomy (Phase 6 §G) | — | Live `facets/finish-texture` exists — see §4.2 |
| **Professional Role** (6 families, ~20 roles) | 0 | **Missing entirely** | — | Create; targets `Project Credit.role`, not an entity field |
| **Organization Type** (10 values) | 0 | **Missing entirely** | — | Create |
| **Sustainability** (6 categories) | 0 | **Missing entirely** | — | Create; note live `facets/sustainability` exists |

### 4.1 Material Family — approved (9) vs live (14)

| Approved Family | Live equivalent | Classification | Assignments |
|---|---|---|---|
| Stone | `stone` (10 types) | **Match** | 3 (+ `limestone` 1) |
| Wood | `wood` (5 types) | **Match** | 9 (+ oak 6, pine 2, spruce 2, larch 1, beech 1, plywood 1) |
| Metal | `metal` (8 types) | **Match** | 8 (+ aluminum 9, steel 7, brass 5, stainless 3, corten 2) |
| Animal-Based Material | `textile-fabric/leather` | **Depth mismatch** | 3 | Approved makes this a Family; live nests it under Textile |
| Glass | `glass` (10 types) | **Match** | 10 |
| Ceramic | `ceramic-tile` (9 types) | Rename | 0 (+ ceramic 5) |
| Concrete / Cementitious | `concrete-cement` (6 types) | **Match** | 6 (+ micro-cement 1) |
| Plastic / Synthetic | `plastic-polymer` (19 types) | Rename | 0 |
| Composite | `composite` (7 types) | **Match** | 0 |
| — | `adhesive-sealant` | **Orphan** | 0 |
| — | `brick-masonry` | **Orphan** | 2 (+ clay-brick 2) |
| — | `gypsum-plaster` | **Orphan** | 3 |
| — | `insulation` | **Orphan** | 0 |
| — | `paint-coating` | **Orphan** | 0 (+ lime-wash 1, plaster-stucco 1) |
| — | `textile-fabric` | **Partial** | 1 |

**5 live material families (7 assignments) have no approved home**: `brick-masonry` (4), `gypsum-plaster` (3), `paint-coating` (2), `adhesive-sealant` (0), `insulation` (0). These look like legitimate architectural materials the approved 9-family list omits rather than deliberately excludes — **recommend reviewing whether Phase 6 §F should be extended**, not deleting live data.

### 4.2 Existing `facets` table overlaps three Phase 6 dimensions

The live `facets` / `facet_values` / `listing_facets` tables (6 facets, 69 values, 108 assignments) are **not** part of `taxonomy_nodes` but cover ground Phase 6 assigns to taxonomy dimensions:

| Live facet | `applies_to` | Overlaps approved dimension |
|---|---|---|
| `design-style` | product, project | **Style** (Phase 6 §D) |
| `finish-texture` | product | **Finish** (Phase 6 §G — correctly an Attribute, not taxonomy) |
| `sustainability` | product | **Sustainability** (Phase 6 §J) |
| `room-type` | product | **Space Type** (Phase 6 §B) |
| `architectural-element` | project | No approved dimension |
| `color-family` | product | Attribute (not a Phase 6 dimension) |

`finish-texture` is the one case where the live implementation **already matches** the approved model's mechanism (Controlled Attribute, not taxonomy). The other three would need a decision: migrate facet values into `taxonomy_nodes`, or keep them as facets and treat Phase 6 §B/§D/§J as already partially satisfied by a different mechanism. **Surfaced, not resolved** — this is a modeling decision, not a mapping.

---

## 5. Orphan / legacy live nodes — summary

| Domain | Live nodes | Nodes with no approved home | Assignments at risk |
|---|---|---|---|
| project | 117 | ~24 (incl. 4 top-level: `commercial`, `interior`, `office`, `other`) | **6 of 49** |
| product | 642 | 1 top-level (`other`) + Type-level duplicates | **1 of 77** *(was 14, before Domains 8 & 9)* |
| material | 204 | 5 families | **7 of 95** |
| **Total** | **963** | — | **14 of 221 (6%)** *(was 27)* |

**895 of 963 nodes (93%) carry zero assignments** and can be restructured with no data-migration impact. The reconciliation risk is concentrated in 68 nodes, and genuinely contested in only 27 assignments.

---

## 6. Cases requiring human review before any write

Per task §6, these are surfaced, not resolved:

1. **`project/commercial` — 4 assignments, splits 3 ways** (Workplace / Retail / Industrial & Infrastructure). Requires per-listing inspection; no automatic rule can assign them.
2. **`project/interior/workplace-interior` — 1 assignment.** Phase 4 §D moves Interior Design to Discipline, which does not yet exist. This listing has no valid Project Type until a destination is chosen.
3. **`project/other/renovation-restoration` — 1 assignment.** Belongs to Intervention Type, which does not exist yet. Same problem.
4. ~~Building Systems exclusion~~ — **RESOLVED** by amended Phase 5 §I. Domain 9 approved. Three follow-ups it created, **all now decided** — see `PHASE5_DOMAINS_8_9_DEPTH_PASS.md` §1:
   - **4a. Does Domain 9 cover non-MEP building systems?** §I names electrical, plumbing, HVAC "and related building-systems products." Live `building-systems` also holds **Structural Systems** (concrete/steel/timber frame, foundations), **Facade Systems**, **Fire Safety**, **Acoustic Systems**, **Elevator/Lift**, **Partitions**, **Insulation & Waterproofing**, **Staircase Systems**. The original Phase 5 §F excluded "structural components" explicitly, and amended §J item 5 keeps *raw construction materials* open. **4 of the 8 assignments (`prefab-staircase`) sit in this grey zone.**
   - **4b. `laundry-appliances` is mis-parented** under `systems-tech`. Live already has an `appliances` top-level domain, and Phase 5 §F puts "Kitchen Appliances (built-in)" under Domain 5. Zero assignments — cheap to fix, but needs a destination.
   - **4c. The two live nodes are not a clean union.** `plumbing` children are *complementary* between them (drainage/pipework/water-supply/water-treatment vs boiler/pipe-fitting/valve/water-heater); `av-media` children are *identical*. The merge needs per-family rules, not a blanket reparent.
5. ~~`decor-accessories` has no approved domain~~ — **RESOLVED** by amended Phase 5 §I. Domain 8 approved. One follow-up:
   - **5a. `cushions-throws` overlaps Domain 6.** Live `decor-accessories/cushions-throws` duplicates Phase 5 §F's "Cushions & Pillows" family under Textiles & Soft Furnishings. Zero assignments — naming decision only.
6. **Duplicate live top-level label `Building Systems`** (`building-systems` / `systems-tech`), 4 assignments each — resolved in principle by §I's merge directive, but blocked on 4a/4c above.
7. **5 live material families with no approved home** (`brick-masonry`, `gypsum-plaster`, `paint-coating`, `adhesive-sealant`, `insulation`) — 7 assignments.
8. **Three Phase 6 dimensions already partially implemented as `facets`** (Style, Sustainability, Space Type) — migrate to taxonomy or accept the facet mechanism?
9. **Domains 4–7 are shallower in the approved model than live.** Reconciling now discards live depth that carries assignments. Recommend deferring until the Phase 5 follow-up pass.
10. **Lighting family structure conflict**: approved has one "Fixtures" family; live has six mounting-based families. Approved is flatter — confirm this is intended.

---

## 7. Corrections to the task brief

| Task brief statement | Actual |
|---|---|
| "the entire Sports & Recreation branch, if not yet present" | **Already present** live: `sports-recreation` with 6 children |
| Phase 5 domains "each built to full Family → Type → Subtype depth" | Phase 5 §F defers Domains 4–7 to **Family level only** |
| "live might have 'Government Building' where approved has 4 nodes" | **Confirmed** — `public-civic/government-building` exists and the split is needed |
| 963 rows in `taxonomy_nodes` | **Confirmed** |
| 221 rows in `listing_taxonomy_node` | **Confirmed** — across 68 distinct nodes, 126 primary |

---

## 8. Recommended sequencing (not executed)

1. **Resolve the remaining scope questions** (§6 items 4a–4c, 5a, 7) — they determine whether nodes are created or listings re-pointed. Items 4 and 5 are now closed by amended Phase 5.
2. **Create the 7 missing supporting dimensions** — pure inserts, zero migration risk, and unblocks §6 items 2 and 3.
3. **Decide facets vs taxonomy** for Style / Sustainability / Space Type (§6 item 8) before creating those dimensions, to avoid building a duplicate.
4. **Project Type restructure** — 117→58 nodes, only 6 assignments contested.
5. **Product Domain restructure last** — largest, most contested, and partly blocked on the Phase 5 follow-up pass.

No node was created, renamed, or retired in producing this report.
