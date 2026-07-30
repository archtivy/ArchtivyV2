# Phase 5 — Domains 3–7: Family → Type → Subtype Depth Pass

**Status:** Amendment to Phase 5. Companion to `PHASE5_DOMAINS_8_9_DEPTH_PASS.md`. Nothing applied.
**Grounding:** built from the live `taxonomy_nodes` trees, same method as Domains 8/9. Every node is annotated with its live origin.
**Scope:** Domain 3 (Surfaces & Finishes — previously "substantial", now complete), Domains 4–7 (previously Family-summary only).
**Deferred by instruction:** the 6 project-side contested assignments.

---

## 1. Decisions recorded

| # | Decision |
|---|---|
| **D-1** | **Emergency lighting → Domain 9 › Fire Safety.** Confirmed. Removed from Domain 2. |
| **D-2** | **`glass-partition` stays in Domain 4 only.** Excluded from Domain 9 › Partitions with a redirect note. No duplicate node. Protects the 1 live assignment. |
| **D-3** | **Applied/decorative finish → Domain 3; engineered structural system → Domain 9.** Codified as the standing rule (§2.3). |
| **D-4** | **Five material families added to Phase 6 §F** as omissions: Brick & Masonry, Gypsum & Plaster, Paint & Coating, Adhesive & Sealant, Insulation. |

### 1.1 The D-3 rule, as codified

> **Surface Rule.** Where a product exists as both an applied finish and an engineered system, classification follows *how it is specified and installed*, not what it is made of.
> - **Domain 3 — Surfaces & Finishes:** the product is applied *to* a completed substrate as a finish layer. Specified by appearance, format, and finish. Example: an acoustic wall panel selected for its fabric and colour.
> - **Domain 9 — Building Systems:** the product is an engineered assembly with a performance rating, forming part of the building's fabric. Specified by rating (R_w, U-value, fire class). Example: an acoustic wall system specified to achieve R_w 45 dB.
>
> **Tie-break:** if the product carries a *mandatory performance rating* in its specification, it is Domain 9.

Applied below to `acoustic-wall-panel`, `facade-systems`, `structural-glass`, `glass-balustrade`, `operable-wall`, `ceiling-systems`.

---

## 2. Document corrections

### 2.1 Phase 5 §E (Surfaces & Finishes)

| Was | Now |
|---|---|
| 3 families (Flooring, Wall & Ceiling Finishes, Countertop Surfaces) | **4 families** — adds **Architectural Glass**. Full Type/Subtype depth per §3 below. |
| "Exclusion: Structural flooring/wall substrate systems (out of MVP scope, §F)" | Superseded — substrate/engineered systems are **Domain 9**, not out of scope. Governed by the Surface Rule (§1.1). |

### 2.2 Phase 5 §F

| Was | Now |
|---|---|
| "Domains 4–7 … full Family/Type/Subtype breakdown deferred to a Phase 5 follow-up pass" | **Superseded by this document.** Domains 4–7 are now at full depth. The only remaining Family-summary content in Phase 5 is none. |

### 2.3 Phase 5 §D (Lighting)

| Was | Now |
|---|---|
| "Exclusion: Emergency/life-safety lighting systems (out of MVP scope, flagged in §F)" | "Emergency/life-safety lighting → **Domain 9 › Fire Safety › Emergency Lighting**" (D-1). No longer out of scope. |

### 2.4 Phase 6 §F (Material Family) — D-4

Approved Material Families go from **9 → 14**. Added, with live origin and assignments:

| Added Family | Live node | Types | Assignments | Rationale |
|---|---|---|---|---|
| Brick & Masonry | `material/brick-masonry` | 5 (adobe, clay-brick, concrete-block, natural-stone-masonry, rammed-earth) | **4** | Core architectural material; omission, not exclusion |
| Gypsum & Plaster | `material/gypsum-plaster` | 6 | **3** | Same |
| Paint & Coating | `material/paint-coating` | 10 | **2** | Same. Note the *product* form is Domain 3 › Paint / Coating; this is the substance |
| Adhesive & Sealant | `material/adhesive-sealant` | 6 | 0 | Same |
| Insulation | `material/insulation` | 8 | 0 | Same. Product form is Domain 9 › Insulation & Waterproofing |

All 5 are **Match** classifications — adopt live as-is. **7 previously-contested material assignments now resolve.**

---

## 3. Domain 3 — Surfaces & Finishes

**Live sources:** `flooring` (6 fam), `surfaces-countertops` (7 fam), `walls-ceilings-facades` (7 fam, **9 assignments**), `surfaces-materials` (8 fam — **retired**, see §8).

### 3.1 Family: Flooring

| Type | Subtypes | Live origin |
|---|---|---|
| Tile Flooring | Ceramic Floor Tile, Porcelain Floor Tile, Stone Flooring, Mosaic | `flooring/tile-stone-flooring/*` |
| Wood Flooring | Solid Wood, Engineered Wood, Parquet, Plank | `flooring/wood-flooring/*` |
| Resilient Flooring | Vinyl / LVT, Linoleum, Rubber Flooring | `flooring/resilient-flooring/*` |
| Carpet (fitted) | Broadloom, Carpet Tile, Natural Fibre | `flooring/carpet-flooring/*` |
| Specialty Flooring | Laminate Flooring, Resin Flooring, Terrazzo Flooring | `flooring/specialty-flooring/*` |

`flooring/outdoor-flooring` → **Domain 7** (§7.4). Loose rugs → **Domain 6** per Phase 5 §E.

### 3.2 Family: Wall & Ceiling Finishes — **9 assignments land here**

| Type | Subtypes | Live origin | Assign |
|---|---|---|---|
| Wallcovering | Wallpaper, Textile Wallcovering, Decorative Film | `wallcoverings/*` | 0 |
| Wall Panel & Cladding | **Wood Cladding**, **Metal Panel**, Stone Cladding, Decorative Panel | `wall-panels-cladding/*` | **7** (wood-cladding 4, metal-panel 3) |
| Wall Tile | Ceramic Wall Tile, Porcelain Wall Tile, Mosaic | `wall-tiles/*` | 0 |
| Masonry Finish | **Brick**, Stone Veneer, Concrete Block | `brick-masonry/*` | **2** |
| Paint / Coating | Interior Paint, Exterior Paint, Specialty Coating | — **net-new** (live has only the *material*) | 0 |
| Ceiling Finish | Ceiling Panel, Ceiling Tile, Stretch Ceiling | `ceiling-systems/*` + `surfaces-materials/ceiling-surfaces/*` | 0 |
| Acoustic Panel (applied) | Fabric Acoustic Panel, Wood Acoustic Panel | `acoustic-solutions/acoustic-panel` | 0 |

**Surface Rule applied:** `acoustic-solutions/sound-absorber` and `acoustic-ceiling-panel` → **Domain 9 › Acoustic Systems** (rated systems). `walls-ceilings-facades/facade-systems` (curtain-wall, rainscreen, ventilated-facade, composite-panel, solar-shading) → **Domain 9 › Facade Systems** entirely — these are rated assemblies, and D9 already owns the same concept.

### 3.3 Family: Countertop Surfaces

| Type | Subtypes | Live origin |
|---|---|---|
| Natural Stone Surface | Granite, Marble, Limestone, Slate, Stone Worktop | `natural-stone/*` |
| Engineered Stone Surface | Quartz, Sintered Stone, Porcelain Slab, Quartz Worktop | `engineered-quartz/*` |
| Solid Surface | Acrylic Solid Surface, Composite Surface | `solid-surface/*` |
| Terrazzo Surface | Poured Terrazzo, Precast Terrazzo | `terrazzo/*` |
| Laminate Countertop | HPL, Laminate | `laminate-surfaces/*` |
| Wood Countertop | Butcher Block, Wood Worktop | `wood-countertops/*` |
| Concrete Surface | Concrete Surface, Microcement | `concrete-cement/*` |

### 3.4 Family: Architectural Glass (**new**)

| Type | Subtypes | Live origin |
|---|---|---|
| Decorative Glass | Decorative Glass | `surfaces-materials/glass/decorative-glass` |

**Surface Rule applied:** `structural-glass` → **Domain 9 › Structural Systems**; `glass-balustrade` → **Domain 9 › Staircase Systems** (alongside Stair Railing); `glass-partition` → **Domain 4 only** (D-2).

> This family holds a single Type today. Retained as a named family because Domains 3 and 4 and 9 all touch glass, and an explicit home prevents the next contributor re-creating the duplication we are removing.

---

## 4. Domain 4 — Doors, Windows & Hardware

**Live sources:** `doors-windows` (5 fam, **6 assignments**), `hardware` (6 fam, 0).

### 4.1 Family: Doors — **5 assignments**

| Type | Subtypes | Live origin | Assign |
|---|---|---|---|
| Interior Door | **Hinged Door**, **Sliding Door**, Pivot Door, Pocket Door | `interior-doors/*` | **5** (hinged 4, sliding 1) |
| Exterior Door | Entry Door, Patio Door, Garage Door | `exterior-doors/*` | 0 |

Fire-rated doors → **Domain 9 › Fire Safety** (mandatory rating, per Surface Rule tie-break).

### 4.2 Family: Windows

| Type | Subtypes | Live origin |
|---|---|---|
| Window | Casement, Fixed, Sliding | `windows/*` |
| Roof Window / Skylight | Roof Window | `windows/roof-window` |

### 4.3 Family: Glass Partitions & Screens — **1 assignment** (D-2)

| Type | Live origin | Assign |
|---|---|---|
| **Glass Partition** | `glass-partitions/glass-partition` | **1** |
| Frameless Glass | `glass-partitions/frameless-glass` | 0 |

> **D-2 redirect note (to be carried on the node):** *"Glass Partition is owned exclusively by Domain 4. Domain 9 › Partitions must not create a competing `glass-partition-system` node — redirect there points here."*
>
> `glass-partitions/operable-wall` → **Domain 9 › Partitions** (engineered movable wall, Surface Rule). Not duplicated here.

### 4.4 Family: Door & Window Hardware

| Type | Subtypes | Live origin |
|---|---|---|
| Handles & Knobs | Door Handle, Lever Handle, Door Knob, Pull Handle | `handles-knobs/*`, `door-window-hardware/door-handle` |
| Hinges & Pivots | Hinge, Concealed Hinge, Pivot | `hinges-slides/*`, `door-window-hardware/hinge` |
| Locks & Cylinders | Lock, Cylinder, Latch | `locks-security/*` |
| Door Closers & Controls | Door Closer, Door Fitting | `door-window-hardware/*` |
| Window Hardware | Window Handle, Window Fitting | `door-window-hardware/*` |

`locks-security/electronic-lock` → **Domain 9 › Security & Access** (powered/networked). Mechanical locks stay here.

### 4.5 Family: Cabinet & Furniture Hardware

| Type | Subtypes | Live origin |
|---|---|---|
| Cabinet Hardware | Cabinet Pull, Drawer Pull | `handles-knobs/*` |
| Drawer Slides | Drawer Slide | `hinges-slides/drawer-slide` |

### 4.6 Family: Architectural Ironmongery & Fixings

| Type | Subtypes | Live origin |
|---|---|---|
| Architectural Ironmongery | Kickplate, Letter Plate, Rail, Signage | `architectural-ironmongery/*` |
| Brackets & Supports | Bracket, Shelf Bracket, Support, Mount | `brackets-supports/*` |
| Fixings | Clip, Fastener, Hook | `other-hardware/*` |

⚠️ **Scope flag.** Phase 5 §F defines Domain 4 as "openings, glazing, and the hardware that operates or secures **them**." Brackets, hooks and fasteners are general building hardware, not opening hardware. They are placed here because no better home exists — the alternative is a Domain 10 "General Hardware & Fixings". **Zero assignments; needs a call.** See §9.

---

## 5. Domain 5 — Kitchen & Bath Fixtures

**Live sources:** `kitchen` (7 fam, **1**), `bathroom` (5 fam, **1**), `appliances` (**retired**, §8), `systems-tech/laundry-appliances` (per decision 4b).

### 5.1 Family: Sinks & Faucets — **2 assignments**

| Type | Subtypes | Live origin | Assign |
|---|---|---|---|
| Kitchen Sink | Inset Sink, Undermount Sink, Prep Sink | `kitchen-sinks/*` | 0 |
| Kitchen Faucet | **Kitchen Mixer**, Pot Filler, Instant Hot Tap, Tap | `kitchen-faucets/*` | **1** |
| Basin | Basin | `sanitaryware/basin` | 0 |
| Bathroom Faucet | Basin Mixer, **Bath Mixer**, Shower Mixer, Thermostatic Valve | `bathroom-faucets/*` | **1** |

### 5.2 Family: Bathing Fixtures

| Type | Subtypes | Live origin |
|---|---|---|
| Bathtub | Bathtub | `bathtubs-showers/bathtub` |
| Shower | Shower, Shower Enclosure, Shower Tray | `bathtubs-showers/*` |

### 5.3 Family: Sanitaryware

| Type | Live origin |
|---|---|
| Toilet · Bidet · Urinal | `sanitaryware/*` |

### 5.4 Family: Kitchen Appliances (built-in)

| Type | Subtypes | Live origin |
|---|---|---|
| Cooking | Oven, Hob, Cooker, Range Cooker, Microwave | `cooking-appliances/*` |
| Refrigeration | Refrigerator, Freezer, Wine Cooler | `refrigeration/*` |
| Dishwashing | Dishwasher | `dishwashing/dishwasher` |
| Extraction | Hood, Ceiling Extractor, Downdraft | `ventilation-hoods/*` |

### 5.5 Family: Laundry Appliances (decision 4b)

| Type | Live origin |
|---|---|
| Washing Machine · Dryer · Washer-Dryer | `systems-tech/laundry-appliances/*` |

### 5.6 Family: Kitchen & Bath Furniture

| Type | Subtypes | Live origin |
|---|---|---|
| Vanity & Bathroom Storage | Vanity Unit, Bathroom Cabinet, Mirror Cabinet, Bathroom Shelf | `bathroom-furniture/*` |
| Kitchen Units | Kitchen Island, Pantry Unit | `kitchen-accessories/*` |

### 5.7 Family: Kitchen & Bath Accessories

| Type | Subtypes | Live origin |
|---|---|---|
| Bathroom Accessories | Towel Rail, Grab Bar, Soap Dispenser, Bathroom Accessory | `bathroom-accessories/*` |
| Kitchen Accessories | Kitchen Accessory | `kitchen-accessories/kitchen-accessory` |

`bathroom-accessories/mirror` → **Domain 8 › Mirrors › Vanity Mirror** (already exists there). Not duplicated.

---

## 6. Domain 6 — Textiles & Soft Furnishings

**Live sources:** `textiles` (7 fam, **1**), `decor-accessories/cushions-throws` (per decision 5a).

| Family | Type | Subtypes | Live origin | Assign |
|---|---|---|---|---|
| **Upholstery Fabric** | Upholstery Fabric | Fabric, Leather, Vinyl | `upholstery/*` | 0 |
| **Loose Rugs** | Area Rug | — | `rugs-carpets/area-rug` | **1** |
| | Runner · Doormat | — | `rugs-carpets/*` | 0 |
| **Drapery & Window Treatments** | Curtain | — | `curtains-blinds/curtain` | 0 |
| | Blind | Roller Blind, Venetian Blind, Shade | `curtains-blinds/*` | 0 |
| **Cushions & Pillows** (5a) | Cushion · Pillow · Throw | — | `decor-accessories/cushions-throws/*` | 0 |
| **Bedding & Bath Linen** | Bed Linen · Towels · Bath Mat | — | `bedding-bath/*` | 0 |
| **Acoustic Textiles** | Acoustic Curtain · Acoustic Textile | — | `acoustic-textiles/*` | 0 |
| **Outdoor Textiles** | Outdoor Fabric · Outdoor Rug | — | `outdoor-textiles/*` | 0 |

`rugs-carpets/carpet` (fitted) → **Domain 3 › Flooring › Carpet**, per the Phase 5 §E fitted/loose rule. `curtains-blinds/screen` is a *window* screen; the outdoor privacy screen of the same slug → Domain 7.

---

## 7. Domain 7 — Outdoor & Landscape Products

**Live source:** `outdoor` (9 fam, **4 assignments — all at domain root, unclassified**) + `furniture/outdoor-furniture`.

| Family | Type | Subtypes | Live origin |
|---|---|---|---|
| **Outdoor Furniture** | Outdoor Seating | Outdoor Lounge, Garden Furniture | `outdoor/outdoor-furniture/*`, `furniture/outdoor-furniture/*` |
| | Outdoor Table | — | both (dedup) |
| | Planter Bench | — | `furniture/outdoor-furniture/planter-bench` |
| **Planters & Garden** | Planter · Raised Bed · Irrigation | — | `garden-landscape/*` |
| **Shade Structures** | Pergola · Awning · Canopy | — | `shade-structures/*` |
| **Decking** | Wood Decking · Composite Decking · Tile-on-Pedestal | — | `decking/*` |
| **Paving & Hardscape** | Paving Stone · Natural Stone Paving · Gravel · Exterior Paving · Outdoor Tile | — | `paving-hardscape/*`, `flooring/outdoor-flooring/*` |
| **Fencing & Screens** | Fencing · Gate · Privacy Screen | — | `fencing-screens/*` |
| **Outdoor Heating & Cooking** | BBQ / Grill · Outdoor Heater | — | `other-outdoor/*` |

**Retired:** `outdoor/landscape` family — 100% duplicated by Decking / Fencing & Screens / Paving & Hardscape / Shade Structures (decking, fencing, paving, pergola, screen all appear twice). Zero assignments.
**Retired:** `outdoor/outdoor-lighting` — duplicates `lighting/outdoor-lighting`. Phase 5 §F scopes Domain 7 as "beyond outdoor Furniture/**Lighting** already covered above". Outdoor lighting stays **Domain 2**.

⚠️ **The 4 assignments sit on the `outdoor` domain root**, not a leaf — the product equivalent of the `project/commercial` problem. They are unclassified and need per-listing review. See §9.

---

## 8. Duplicate aggregators — retire

Three live top-level nodes are near-pure re-listings of content owned elsewhere. Measured:

| Live domain | Types | Duplicated elsewhere | Assignments | Action |
|---|---|---|---|---|
| `fixtures-fittings` | 24 | **24 (100%)** | 0 | **Retire.** Bathroom→D5, Kitchen→D5, Door&Window→D4, Other→D4, Radiators&HVAC→D9 |
| `appliances` | 17 | **17 (100%)** | 0 | **Retire.** Kitchen→D5, Laundry→D5, Climate→D9 HVAC, Other (boiler/water-heater)→D9 Plumbing |
| `surfaces-materials` | 39 | **32 (82%)** | 0 | **Retire.** Flooring/Countertops/Tiles/Wall→D3, Glass→D3+D4+D9 per Surface Rule |
| `office-workspace` | 15 | 4 (27%) | 0 | **Retire as a domain** — it is a *space-based* grouping, not a product universe (violates Phase 5 §A.1). Office Furniture→D1, Partitions & Screens→D9, Acoustic (pod/booth)→D9, Conference (projector/VC)→D9 AV, Collaboration Table→D1 |

**Context:** 112 of the 504 live d2 slugs (22%) appear under more than one parent. Retiring these four removes the bulk of it. All four have **zero assignments** — no migration risk.

---

## 9. Flagged for decision (not resolved)

1. **General hardware has no home** (§4.6). Brackets, hooks, fasteners, mounts sit in Domain 4 against its own definition. Options: accept, or open **Domain 10 — General Hardware & Fixings**. Zero assignments.
2. **`outdoor` root carries 4 unclassified assignments** (§7). Needs per-listing review, same class of problem as `project/commercial`.
3. **`office-workspace` retirement** (§8) distributes across four domains. Confirm the split — particularly `acoustic-pod` / `phone-booth`, which are arguably Furniture (freestanding) rather than Building Systems.
4. **Architectural Glass holds one Type** (§3.4). Keep as a named family, or fold Decorative Glass into Wall & Ceiling Finishes?
5. **`screen` is three different products** — window screen (D6), privacy screen (D7), office screen (D1/D9). Slugs must diverge on creation.

---

## 10. Migration map — assignment landing

| Domain | Live source(s) | Assignments | Destination |
|---|---|---|---|
| 3 — Surfaces & Finishes | `walls-ceilings-facades` | **9** | Wall & Ceiling Finishes (wood-cladding 4, metal-panel 3, brick 2) |
| 4 — Doors, Windows & Hardware | `doors-windows` | **6** | Doors (5), Glass Partitions (1) |
| 5 — Kitchen & Bath | `kitchen`, `bathroom` | **2** | Sinks & Faucets |
| 6 — Textiles | `textiles` | **1** | Loose Rugs › Area Rug |
| 7 — Outdoor | `outdoor` (root) | **4** | ⚠️ unclassified — review |
| **Total** | | **22** | |

**Full product reconciliation:** 33 (D1) + 8 (D2) + 22 (D3–7) + 5 (D8) + 8 (D9) + 1 (`other`) = **77** ✓ — every live product assignment accounted for.

Only **5 of 77 (6%)** need human input: the 4 on `outdoor` root, and the 1 on `product/other`.

---

## 11. Decision log

1. **Domains 3–7 brought to full Family → Type → Subtype depth**, matching Domains 1–2 and 8–9. Phase 5 no longer contains any Family-summary-only content.
2. **Domain 3 gains a fourth family** (Architectural Glass) and full Type/Subtype depth across all four.
3. **Four live top-level domains retired as duplicate aggregators** — `fixtures-fittings` (100% duplicated), `appliances` (100%), `surfaces-materials` (82%), `office-workspace` (space-based grouping, violates §A.1). Zero assignments between them.
4. **The Surface Rule (§1.1) is codified** and applied to acoustic panels, facade systems, structural glass, balustrades, operable walls and ceiling systems.
5. **`glass-partition` is Domain 4 exclusive** (D-2), with a redirect note carried on the node so Domain 9 cannot re-create it.
6. **Emergency lighting relocated** to Domain 9 › Fire Safety (D-1); Phase 5 §D exclusion superseded.
7. **Phase 6 Material Families 9 → 14** (D-4), resolving 7 contested material assignments.
8. **22 of 77 product assignments** land in Domains 3–7, all but 4 on unambiguous leaves.
9. **Five items flagged, none resolved unilaterally** (§9).
10. **Project-side contested assignments deferred** by instruction.

**Not done:** no `taxonomy_nodes` row created, renamed, or retired.
