# D-7 — Combined Review Batch (11 items)

**Status:** awaiting per-item human decision. **Nothing in this file has been applied.**

Deferred across three earlier decisions and batched here as agreed. These are single-value
judgement calls: each one is a listing whose classification cannot be derived from its data
without a human reading the content and deciding what it *is*.

- 4 items — product listings sitting on the `product/outdoor` **root** (depth 0, an aggregator)
- 6 items — project listings on a root or on a conflated node
- 1 item — the last `room-type` facet assignment, blocking that facet's retirement

---

## ⚠️ Structural blocker affecting items 5–10

Before the project-side items can be decided, note that the **destination menu itself is not
clean**. The live `project` tree has 14 roots, and four of them overlap:

| Overlap | Nodes |
|---|---|
| Office | `commercial/office-building`, `commercial/headquarters`, `commercial/co-working` **vs** `office/corporate-office`, `office/co-working-space`, `office/executive-suite` |
| Retail | `commercial/retail-store`, `commercial/showroom`, `commercial/shopping-mall` **vs** `retail/boutique`, `retail/flagship-store`, `retail/showroom-gallery`, `retail/department-store` |
| Interior | `interior/*` (6 children) — **not a Project Type at all.** "Workplace Interior" answers *what was done* (Intervention: Interior Fit-Out) and *what space* (Space Type: Workplace), not *what kind of project*. |
| Intervention-in-Project-Type | `other/renovation-restoration`, `other/adaptive-reuse` — both are **Intervention Types**, which now exist as their own dimension (`intervention_type`, tranche 1) |

**Consequence:** choosing `commercial/office-building` for item 8 while `office/corporate-office`
sits equally valid makes the choice arbitrary, and the arbitrary half becomes a permanent
inconsistency. The same applies to items 9 and 10, where the *current* node is itself the
conflation.

This is the project-side twin of the product-side duplicate-aggregator problem already recorded
in the gap report (`fixtures-fittings`, `appliances`, `surfaces-materials`, `office-workspace`).
It was not in scope for Phases 4–6 and is **not** proposed here — but it is the reason several
items below have a "re-model" option alongside the plain "pick a child" option.

---

## ⚠️ Structural blocker affecting items 1–4

Two competing **Outdoor Furniture** branches exist:

- `outdoor/outdoor-furniture` (Domain 7 — Outdoor & Landscape), 7 types
- `furniture/outdoor-furniture` (Domain 1 — Furniture), 0 types

Neither carries any assignment. Whichever is chosen, the other should be retired or turned into
a redirect — otherwise the four items below split across two trees by accident of who filed them.

The Domain 7 type layer is *also* internally duplicated: `lounge` **and** `outdoor-lounge`;
`planter` **and** `planter-bench`; `garden-furniture` as a catch-all overlapping all of them.
And `outdoor/decking` duplicates `outdoor/landscape/decking`; `outdoor/landscape/screen`
duplicates `outdoor/fencing-screens/screen`; `outdoor/landscape/pergola` duplicates
`outdoor/shade-structures/pergola`.

**No `daybed` type exists anywhere in the tree.** Items 1 and 2 are both daybeds.

---

# PRODUCT SIDE — 4 items on the `product/outdoor` root

All four: `product:outdoor [PRIMARY]`, depth 0, `category = NULL`, `product_type = 'outdoor'`,
status APPROVED. All four are Flexform pieces.

---

### Item 1 — Atlante Wood Outdoor Daybed

| | |
|---|---|
| slug | `atlante-wood-outdoor-daybed` |
| year | 2022 |
| current | `product:outdoor` **[PRIMARY]** — a root, not a leaf |
| also has | `room-type/outdoor` facet → **this is item 11** |
| description | 1,981 chars |

> Outdoor daybed design is central to creating comfortable and durable open-air lounge spaces,
> and the Atlante Light | Atlante Wood collection by Flexform approaches this category with a
> refined balance of structure, materiality, and practical use. Designed by Antonio Citterio in
> 2022, the collection includes **two closely related versions** that share the same overall
> purpose and silhouette while differing in their surface expression and tactile character.
> Both models are intended for outdoor environments such as **terraces, poolside settings,
> decks, and landscaped backyards** […] Atlante Light features a cast aluminum structure paired
> with a mesh seat and backrest made from synthetic fibers […] Atlante Wood offers a warmer and
> more natural interpretation […] Its aluminum frame is combined with ha[rdwood…]

**Why ambiguous**
1. It is a **daybed**, and no `daybed` type exists in either outdoor branch.
2. Daybed sits between *seating* and *bed* — `outdoor-lounge`, `outdoor-seating` and
   `lounge` are all defensible, and `furniture/beds-bedroom` is defensible on the other axis.
3. **Data-quality issue:** this listing documents *two products* (Atlante Light and Atlante
   Wood) under one title. Materials differ between them — aluminium+mesh vs aluminium+wood.
   Classification can't be fully correct while the listing conflates two SKUs.

**Candidate destinations**
- (a) `outdoor/outdoor-furniture/outdoor-lounge`
- (b) `outdoor/outdoor-furniture/lounge` *(duplicate of (a) — one should die)*
- (c) `outdoor/outdoor-furniture/outdoor-seating`
- (d) `furniture/outdoor-furniture` + create a `Daybed` type
- (e) create `outdoor/outdoor-furniture/daybed` and use it *(also serves item 2)*

---

### Item 2 — Hamptons Outdoor Daybed

| | |
|---|---|
| slug | `hamptons-outdoor-daybed` |
| year | 2021 |
| current | `product:outdoor` **[PRIMARY]** |
| facets | `color-family/brown` |
| description | 2,236 chars |

> Outdoor daybed design plays a critical role in defining high-end relaxation spaces, and the
> Hamptons Outdoor Daybed by Flexform represents a refined approach to comfort, craftsmanship,
> and material longevity. Designed by Antonio Citterio in 2021 […] The structure is crafted
> entirely from **solid iroko wood** […] Elevated aluminum feet prevent direct contact with the
> ground […] The **adjustable backrest** allows users to shift between multiple reclining
> positions, transforming the piece from a seating element into a fully relaxed lounging
> surface. The base integrates water-repellent elastic webbing […] Generously padded cushions,
> upholstered in removable water-re[pellent…]

**Why ambiguous**
Same missing-`daybed`-type problem as item 1. The description explicitly describes it
transforming *"from a seating element into a fully relaxed lounging surface"* — i.e. it is
genuinely both, which is exactly why a single-value pick is a judgement call.

**Candidate destinations** — same set as item 1. Deciding 1 and 2 together is recommended;
they are the same product category from the same manufacturer.

Also worth noting: this listing carries `color-family/brown` but no `material` assignment,
despite "solid iroko wood" being the headline material. Not a D-7 item — flagged separately.

---

### Item 3 — Ortigia Outdoor Armchair

| | |
|---|---|
| slug | `ortigia-outdoor-armchair` |
| year | 2019 |
| current | `product:outdoor` **[PRIMARY]** |
| facets | none |
| description | 1,947 chars |

> Outdoor armchair design is essential for creating refined and comfortable open-air
> environments, and the Ortigia Outdoor Armchair by Flexform […] Designed in 2019 by the
> Flexform Design Center […] The structure is entirely crafted from **solid iroko wood** […]
> The base is supported by die-cast metal alloy feet with protective nylon tips […] A key visual
> and functional element […] is its **hand-woven backrest**. Available in polypropylene cord,
> polyurethane rubber, or PVC-based weaving systems […] The seat is padded with polyurethane
> foam and protected by water-repellent laminated fabric […] The collection includes multiple
> variations, such as versions with or witho[ut…]

**Why ambiguous**
Least ambiguous of the four — it is unmistakably outdoor seating. The only real question is
*which* of the overlapping seating types, and whether the canonical branch is Domain 7 or
Domain 1.

**Candidate destinations**
- (a) `outdoor/outdoor-furniture/outdoor-seating` ← most direct
- (b) `outdoor/outdoor-furniture/garden-furniture`
- (c) `furniture/seating` + an outdoor marker on another dimension
- (d) `furniture/outdoor-furniture`

---

### Item 4 — Pico Outdoor Coffee - Side Table

| | |
|---|---|
| slug | `pico-outdoor-coffee-side-table` |
| year | 2020 |
| current | `product:outdoor` **[PRIMARY]** |
| facets | none |
| description | 2,147 chars |

> Outdoor coffee table design plays a crucial role in completing lounge-oriented exterior spaces,
> and the Pico Outdoor Coffee & Side Table by Flexform […] Designed in 2020 by the Flexform
> Design Center […] The structure is crafted from **aluminum with an epoxy powder-coated
> finish** […] The legs, made of cast aluminum, are designed with a subtle taper […] A defining
> feature […] is its versatile tabletop system. The top is available in **solid iroko wood
> slats** — offering a warm and natural aesthetic — or in a range of outdoor-suitable stone
> finishes such as **lava stone, porphyry, Cardoso, and Beola Argentata** […]

**Why ambiguous**
1. The title bundles **two products** — a coffee table *and* a side table. Same conflation
   problem as item 1.
2. `outdoor/outdoor-furniture/outdoor-table` is the obvious home, but there is no
   coffee-vs-side distinction at subtype level, so the bundling is currently unresolvable in
   the taxonomy either way.

**Candidate destinations**
- (a) `outdoor/outdoor-furniture/outdoor-table` ← most direct
- (b) `furniture/tables` + outdoor marker elsewhere
- (c) split the listing into two, then classify each

---

# PROJECT SIDE — 6 items

---

### Item 5 — Boston Commonwealth Pier

| | |
|---|---|
| slug | `boston-commonwealth-pier-2` |
| category (legacy) | `Commercial` |
| location | Boston, Massachusetts, United States |
| year | 2026 |
| current | `project:commercial` **[PRIMARY]** — depth 0 root |
| description | 2,467 chars |

> **Adaptive reuse architecture** in waterfront urban contexts defines the Boston Commonwealth
> Pier transformation, a large-scale redevelopment of one of the most historically significant
> maritime structures in the United States. Located in Boston's Seaport District, the project
> reimagines a former industrial and trade hub as a **vibrant, mixed-use destination** that
> reconnects the city with its waterfront. Originally built over a century ago […] The design
> strategy carefully balances **heritage preservation** with modern development. Iconic
> architectural elements such as the stone arches and cornice of the neo-classical headhouse are
> **retained**, while new additions — including curtain wall façades and lightweight structural
> systems — create a dialogue between past and present. At the urban scale, the project
> introduces a **new waterfront plaza at harbour level**, acting as a central public gathering
> space […]

**Why ambiguous**
Three defensible readings, and they are on three different axes:
- **Project Type:** mixed-use commercial building
- **Project Type:** waterfront/urban intervention (the plaza and public realm are load-bearing
  in the description)
- **Intervention Type:** adaptive reuse — which the description names in its *first three words*

Under the pre-Phase-6 taxonomy these competed for one slot. They no longer have to.

**Candidate destinations**
- (a) `project:commercial/mixed-use` **+** `intervention_type:adaptive-reuse` ← uses the new dimension
- (b) `project:landscape-urban/waterfront` + intervention adaptive-reuse
- (c) `project:other/adaptive-reuse` (keeps the conflation — not recommended, see blocker above)
- (d) (a) as primary **plus** (b) as secondary `is_primary=false`

---

### Item 6 — Malmö Live

| | |
|---|---|
| slug | `malm-live` |
| category (legacy) | `Commercial` |
| location | Malmö, Skåne, Sweden |
| year | 2015 |
| current | `project:commercial` **[PRIMARY]** — depth 0 root |
| description | 2,375 chars |

> **Mixed-use cultural architecture** defines Malmö Live, a landmark development that brings
> together **music, hospitality, and urban life** into a single integrated structure […]
> Designed by Schmidt Hammer Lassen, Malmö Live is conceived as an open and accessible "house of
> the city" […] The project is organized as a cluster of distinct yet interconnected volumes,
> housing a **concert hall, conference centre, and hotel**. These elements are arranged to
> function like a "small city" […] At the heart of Malmö Live is a **state-of-the-art symphonic
> concert hall**, designed to serve as a cultural engine for the city. Supporting functions
> include a flexible performance hall, large-scale conference facilities, and a hotel […]

**Why ambiguous**
This is the hardest of the six. It is genuinely three programs, and `Commercial` — the legacy
category it currently carries — is arguably the *least* accurate of the available options: the
description frames the concert hall as the heart and the cultural role as the purpose.

- Concert hall → `cultural/concert-hall`
- Hotel → `hospitality/hotel`
- Conference centre → `hospitality/convention-center`
- Whole → `commercial/mixed-use`

**Candidate destinations**
- (a) `project:cultural/concert-hall` **[PRIMARY]** + `hospitality/hotel` + `hospitality/convention-center` as secondaries ← most faithful to the content
- (b) `project:commercial/mixed-use` **[PRIMARY]** only
- (c) `project:commercial/mixed-use` **[PRIMARY]** + `cultural/concert-hall` secondary
- (d) `project:cultural/cultural-center` **[PRIMARY]**

Note: multi-assignment is already supported — `listing_taxonomy_node` has an `is_primary` flag
and 24 style assignments landed as `is_primary=false` in the last migration.

---

### Item 7 — Vectura Campus F — Stockholm

| | |
|---|---|
| slug | `vectura-campus-f-stockholm` |
| category (legacy) | `Commercial` |
| location | Stockholm, Sweden |
| year | **2028** — in the future |
| current | `project:commercial` **[PRIMARY]** — depth 0 root |
| description | 2,673 chars |

> **Life science campus architecture** reimagined for dense urban environments defines Vectura
> Campus F, a **hybrid vertical campus** designed by Schmidt Hammer Lassen in Stockholm. Unlike
> traditional campus models composed of multiple buildings, this project introduces a compact,
> stacked structure that integrates **education, research, business, and public life** into a
> single cohesive architectural system […] It aims to attract world-leading companies,
> start-ups, and talent […] At the heart of the building is the "Orangery", a continuous,
> publicly accessible spatial sequence […] Three full-height atria and a system of DNA-inspired
> staircases promote vertical interaction […] linking **laboratories, co-working spaces, meeting
> facilities, housing, and cultural programs** […]

**Why ambiguous**
- Research/lab-led → `education/research-facility` or `healthcare/laboratory`
- Campus → `education/campus-master-plan`, but the description explicitly says it is *not* a
  traditional multi-building campus, so "master plan" misdescribes it
- Business/co-working → `commercial/mixed-use` or `commercial/co-working`

**Separate flag, not a Project Type question:** `year = 2028`. Either this is unbuilt/in
progress, or the year field is being used for completion rather than construction. `Unbuilt /
Conceptual` currently lives in the *Project Type* tree (`other/unbuilt-conceptual`) — which is
the same category error as `renovation-restoration`: build status is not a project type. Worth
deciding whether status belongs on its own dimension. **Out of D-7 scope; noted, not proposed.**

**Candidate destinations**
- (a) `project:education/research-facility` **[PRIMARY]**
- (b) `project:commercial/mixed-use` **[PRIMARY]** + `education/research-facility` secondary
- (c) `project:education/campus-master-plan` **[PRIMARY]**
- (d) (a) **[PRIMARY]** + `commercial/co-working` secondary

---

### Item 8 — VIA Oslo — Modern Office & Retail

| | |
|---|---|
| slug | `via-oslo-modern-office-retail` |
| category (legacy) | `Commercial` |
| location | Oslo, Norway |
| year | 2021 |
| current | `project:commercial` **[PRIMARY]** — depth 0 root |
| description | 2,407 chars |

> **Commercial mixed-use architecture** focused on urban connectivity defines VIA Oslo, a
> large-scale **office and retail** development located in the Vika district of central Oslo.
> Designed by Schmidt Hammer Lassen, the project **transforms a previously introverted shopping
> mall site** into a vibrant and permeable urban destination […] The project was conceived as a
> response to the shortcomings of the former building, which lacked integration with its
> surroundings and suffered from **underused office spaces** […] the building draws inspiration
> from natural erosion processes […] introduces a **pedestrian passage** that links Ruseløkkveien
> and Munkedamsveien, effectively creating a new urban shortcut through the city block. At
> ground level, the project is activated by a combination of **exclusive retail spaces, public
> pathways, and a semi-subterranean food court** […]

**Why ambiguous**
Office + retail + food court + public passage = mixed-use. But this is the item most exposed to
the **root-overlap blocker**: office could go to `commercial/office-building` *or*
`office/corporate-office`; retail to `commercial/retail-store` *or* `retail/flagship-store`.
Whichever is picked, the twin remains as a competing home for the next listing.

Also an **intervention**: it replaces an existing shopping mall — `adaptive-reuse` or
`renovation`.

**Candidate destinations**
- (a) `project:commercial/mixed-use` **[PRIMARY]** + `intervention_type:adaptive-reuse` ← recommended shape
- (b) `project:commercial/office-building` **[PRIMARY]** + `commercial/retail-store` secondary
- (c) `project:office/corporate-office` **[PRIMARY]** + `retail/*` secondary
- (d) (a) + `retail_spaces`/`workplace_spaces` on the new `space_type` dimension

---

### Item 9 — Spark Capital - Mercer

| | |
|---|---|
| slug | `spark-capital-mercer` |
| category (legacy) | **NULL** |
| location | New York, New York, United States |
| year | 2020 |
| current | `project:interior/workplace-interior` **[PRIMARY]** — depth 1, a valid leaf |
| also has | `material:wood` |
| description | 2,691 chars |

> **Office interior design for venture capital firms** defines the spatial concept behind Spark
> Capital - Mercer, a **4,000-square-foot workplace** designed by Desai Chia Architecture in
> **SoHo, New York**. Created for Spark Capital's expanded New York office, the project supports
> permanent staff, partners, and visiting teams […] The brief called for a workplace that could
> accommodate focused work, presentations, informal collaboration, and fluid interaction across
> teams in a **compact loft setting**. Located **within an old industrial loft building**, the
> office is organized around a reception lounge connected to three conference rooms […] The
> design concept draws inspiration from **traditional Japanese rock gardens**, particularly the
> patterned formations that symbolize ripples in water […]

**Why ambiguous**
Unlike items 5–8 this one is *already* on a valid depth-1 leaf. It is in the batch because the
leaf is on the **conflated `interior` root**. Decomposed properly, this listing is:

| Dimension | Value |
|---|---|
| Project Type | `office/corporate-office` or `commercial/office-building` |
| Intervention Type | `interior-fit-out` ← *exactly what `interior/workplace-interior` was standing in for* |
| Space Type | `workplace-spaces` (+ `circulation-support-spaces` for the reception/conference rooms) |
| Style | possibly `japanese` — the description leads with Japanese rock gardens |

All four dimensions now exist. The question is whether to leave it (cheap, keeps the
conflation) or re-model it (correct, but implies the same treatment for the whole `interior`
root — a bigger job than D-7).

**Candidate destinations**
- (a) **Leave as-is.** Defer the whole `interior`-root question to a separate pass.
- (b) `project:office/corporate-office` + `intervention_type:interior-fit-out` + `space_type:workplace-spaces`; drop the `interior/workplace-interior` assignment
- (c) Keep `interior/workplace-interior` **and** add `intervention_type:interior-fit-out` + `space_type:workplace-spaces` — additive, no deletion, resolves later
- (d) (b) plus `style:japanese`

---

### Item 10 — Rua da Rosa Lisbon

| | |
|---|---|
| slug | `rua-da-rosa-lisbon` |
| category (legacy) | `Renovation / Restoration` |
| location | Praça Do Príncipe Real, 1250-184 Lisboa, Lisbon, Portugal |
| year | 2026 |
| current | `project:other/renovation-restoration` **[PRIMARY]** |
| description | 2,234 chars |

> Rua da Rosa Lisbon, designed by Contacto Atlântico, is an **urban renovation project** located
> in the Príncipe Real district of Lisbon. The intervention focuses on the **rehabilitation of a
> five-story building, combining commercial functions at ground level with residential units
> above**. The project aims to reactivate an existing structure while preserving its
> architectural identity […] A key aspect of the design is the careful **preservation of the
> building's original elements. The main staircase and traditional ceilings are restored with
> precision** […] The intervention also emphasizes environmental performance through passive
> strategies. **Cross ventilation** is enhanced […] **Natural light** is maximized […] The
> south-west-facing façade is redesigned with efficient frames and durable materials […]

**Why ambiguous**
This is the **canonical case** for the conflation Phase 6 §E was written to fix, and the clearest
demonstration of why. Its only classification is `renovation-restoration`, which answers *what
was done* — so the listing currently has **no Project Type at all**. A user browsing
"Residential" or "Mixed-Use" will never find it.

The content states the Project Type explicitly: ground-floor commercial + residential above =
mixed-use, residential-led.

It is also **both** intervention types at once: *renovation* (rehabilitation, façade redesign,
performance upgrades) **and** *restoration* (staircase and ceilings restored with precision).
`intervention_type` supports multiple assignments.

**Candidate destinations**
- (a) `project:commercial/mixed-use` **[PRIMARY]** + `intervention_type:renovation` + `intervention_type:restoration` ← most faithful
- (b) `project:residential/apartment` **[PRIMARY]** + same two interventions
- (c) `project:residential/housing-complex` **[PRIMARY]** + same two interventions
- (d) (a) or (b), plus keep `other/renovation-restoration` until the `other` root is cleaned up

Whichever is chosen, note that `commercial/mixed-use` is a Commercial child while the building
is residential-led — arguably a fifth symptom of the root-overlap blocker.

---

# FACET SIDE — 1 item

### Item 11 — `room-type/outdoor` on Atlante Wood Outdoor Daybed

| | |
|---|---|
| listing | Atlante Wood Outdoor Daybed (**same listing as item 1**) |
| facet assignment | `room-type` / `outdoor` |
| significance | **the last remaining `room-type` assignment** — blocks that facet's retirement |

**Why it is here**
`room-type` was approved for retirement, but `listing_facets` cascades from `facet_values`, so
deleting the facet destroys this row. Retirement is sequenced *after* this item resolves.

**Why ambiguous**
Two distinct questions, and the second is a modeling question:

1. **Which Space Type node?** The description names *"terraces, poolside settings, decks, and
   landscaped backyards"* — four contexts, mapping to `terrace`, `garden-space`, and no node for
   poolside/deck. Only `outdoor-spaces` (the depth-0 root) covers all of them honestly.
   Available: `outdoor-spaces`, `outdoor-spaces/terrace`, `outdoor-spaces/garden-space`,
   `outdoor-spaces/rooftop`, `outdoor-spaces/courtyard`.

2. **Should a *product* carry a Space Type at all?** Space Type describes *spaces*. On a product
   this means "intended use context", which is a different predicate. Phase 6 §B defines Space
   Type for projects/spaces; nothing says products are in scope. The alternative is to treat
   "suitable for outdoor use" as a **Controlled Attribute** (like `finish-texture`), or to let
   the product's Domain 7 placement from item 1 carry the outdoor semantics implicitly — in
   which case this facet row is redundant and can simply be dropped.

**Candidate resolutions**
- (a) Migrate to `space_type:outdoor-spaces` (root), `is_primary=false`
- (b) Migrate to `space_type:outdoor-spaces/terrace`
- (c) **Drop it.** Item 1's placement under `outdoor/outdoor-furniture` already encodes "outdoor",
  making this duplicate metadata. Cheapest, and avoids putting Space Type on products.
- (d) Keep the semantics as a Controlled Attribute instead of a taxonomy assignment

**Note:** option (c) is a deliberate discard of a live assignment, so it needs explicit approval
— the same standard applied to the three zero-assignment `room-type` values.

---

## Decision summary — one line per item

| # | Listing | Current | Decision needed |
|---|---|---|---|
| 1 | Atlante Wood Outdoor Daybed | `product:outdoor` (root) | which outdoor-furniture type; create `daybed`? |
| 2 | Hamptons Outdoor Daybed | `product:outdoor` (root) | same as 1 — decide together |
| 3 | Ortigia Outdoor Armchair | `product:outdoor` (root) | `outdoor-seating` vs `garden-furniture` |
| 4 | Pico Outdoor Coffee - Side Table | `product:outdoor` (root) | `outdoor-table`; split the listing? |
| 5 | Boston Commonwealth Pier | `project:commercial` (root) | mixed-use vs waterfront; + adaptive-reuse |
| 6 | Malmö Live | `project:commercial` (root) | concert-hall vs mixed-use primary |
| 7 | Vectura Campus F | `project:commercial` (root) | research-facility vs mixed-use |
| 8 | VIA Oslo | `project:commercial` (root) | mixed-use + adaptive-reuse; which office/retail root |
| 9 | Spark Capital - Mercer | `project:interior/workplace-interior` | leave, or decompose into 3 dimensions |
| 10 | Rua da Rosa Lisbon | `project:other/renovation-restoration` | assign a real Project Type + 2 interventions |
| 11 | `room-type/outdoor` facet | `room-type/outdoor` | migrate to space_type, or drop |

## Also surfaced, outside D-7 scope

1. **Project-root overlap** — `commercial` / `office` / `retail` / `interior` compete; `other`
   holds two Intervention Types. Affects items 5–10.
2. **Two `outdoor-furniture` branches** — Domain 1 and Domain 7. Affects items 1–4.
3. **Duplicate outdoor types** — `lounge`/`outdoor-lounge`, `planter`/`planter-bench`,
   `decking` ×2, `screen` ×2, `pergola` ×2.
4. **No `daybed` type** anywhere in the taxonomy.
5. **Three listings bundle multiple products** under one title (items 1 and 4).
6. **Missing material assignments** — items 2, 3, 4 all name iroko wood / aluminium / lava stone
   in their descriptions but carry no `material:*` assignment. Item 9 (a project) has one.
7. **`other/unbuilt-conceptual`** encodes build status as a Project Type — same category error
   as `renovation-restoration`. Item 7 (`year = 2028`) is the trigger.
8. **`listings.category` is stale** — items 5–8 all say `Commercial`, item 9 says NULL despite
   being a clearly classified project. Legacy column, superseded by `listing_taxonomy_node`.

## Sequenced after D-7

`room-type` facet retirement, as its own migration, following the design-style pattern:
snapshot → migrate/resolve → guard → delete. Cannot run until item 11 resolves.
