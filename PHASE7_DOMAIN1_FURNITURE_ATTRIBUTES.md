# Phase 7 — Domain 1 (Furniture) Attribute Definitions & Bindings

**Status:** proposal + evidence only. Nothing written, no migration prepared.
**Date:** 2026-08-02. Live data inspected directly against production.

> **Scope caveat, stated up front.** No Phase 7 document exists in this repository — I
> searched for `*phase7*`, `*phase_7*` and `*attribute*` and found nothing. This proposal
> uses the field list given in the task brief (`attribute_key`, `label`, `data_type`,
> `unit_type`, `validation_rule`, `is_derived`, `ai_extractable`, `facet_eligible`,
> `seo_landing_eligible`, `editable_by`, and the binding fields). If the Phase 7 document
> defines additional fields, every definition below needs those columns filled in before
> anything is written. I have not invented fields to cover the gap.

---

## Step 1 — What the live data actually says

### 1.1 Domain 1 is the largest product domain

| Product root | Listings |
|---|---|
| **furniture** | **33** |
| walls-ceilings-facades | 9 |
| lighting | 8 |
| doors-windows | 6 |
| decor-accessories | 5 |
| building-systems / outdoor / systems-tech | 4 each |
| textiles / kitchen / bathroom / other | 1 each |

33 of 77 classified products (43%) are Furniture. It is the right domain to start with.

**Distribution within Domain 1:**

| Node | Listings |
|---|---|
| `furniture/seating/armchair` | 10 |
| `furniture/seating/sofa` | 9 |
| `furniture/tables/dining-table` | 3 |
| `furniture/seating/dining-chair` | 2 |
| `furniture/seating/lounge-chair` | 2 |
| `furniture/tables/coffee-table` | 2 |
| `furniture/beds-bedroom/bed-frame` | 2 |
| `furniture/tables/console-table` | 1 |
| `furniture/tables/side-table` | 1 |
| `furniture/other-furniture` | 1 |

Family totals: **Seating 23 · Tables 7 · Beds 2 · Other 1**.
**`furniture/storage` has ZERO listings** — see flag F.

### 1.2 The structured fields are empty. This is the single most important finding.

Across all 33 Furniture listings, in the `products` sidecar:

| Field | Populated |
|---|---|
| `material_type` | **0 / 33** |
| `year` | **0 / 33** |
| `brand_profile_id` | **0 / 33** |
| `documents` (jsonb) | **0 / 33** |
| `team_members` (jsonb) | **0 / 33** |
| `color` | **2 / 33** (`serie 18` = Brown, `Nena Armchair` = Black) |
| `color_options` | **2 / 33** (same two listings) |

Every column that could have seeded an attribute value is unused. **There is no structured
data to migrate.** The attribute system for Furniture will be populated from description
text and from future data entry — which makes `ai_extractable` the load-bearing field in
these definitions, not an optimisation.

The one asset that *is* rich: descriptions, 1,431–2,211 characters, on all 33.

### 1.3 Live facet data on Furniture

| Facet | Value | Furniture assignments |
|---|---|---|
| `color-family` | brown 4, black 2, gray 1, green 1, natural 1, other 1, silver 1, wood 1 | **12** |
| `finish-texture` | glossy 1 | **1** |

Both were confirmed as Controlled Attributes in the Phase 6 work and deliberately retained
when `design-style` and `room-type` were retired. 13 live assignments total on Furniture.

### 1.4 What the description text actually supports

Measured across all 33 descriptions with Postgres regex. **Per family, not domain-wide** —
domain-wide percentages hide where an attribute really lives.

| Signal | Seating (23) | Tables (7) | Beds (2) | Other (1) |
|---|---|---|---|---|
| cushion / foam / down | **22** | 0 | 2 | 0 |
| upholstered | **20** | 1 | 2 | 0 |
| leather | **19** | 1 | 0 | 0 |
| shape word (round/rect/oval/square) | 12 | **5** | 2 | 1 |
| collection / family / range | 13 | **5** | 1 | 1 |
| **modular** | **10** | 0 | 0 | 0 |
| armrest | **9** | 0 | 0 | 0 |
| base / legs / feet / pedestal / sled | 9 | **5** | 1 | 0 |
| seat capacity (`N-seater`) | **2** | 0 | 0 | 0 |
| extendable | 2 *(false positives — "extends" used figuratively)* | **0** | 0 | 0 |

Domain-wide signals: designer named **19/33 (58%)** · collection **20/33 (61%)** ·
made-in/origin **7/33 (21%)** · year in text **7/33 (21%)** · wood species **6/33 (18%)** ·
metal **10/33 (30%)** · dimensions in cm/mm **2/33 (6%)** · certification **1/33 (3%)** ·
sustainability claim **1/33 (3%)** · weight **0** · price **0** · BIM/CAD **0** ·
warranty **0** · stackable **0** · height-adjustable **0**.

> **Method note.** My first pass used `\b` for word boundaries, which in Postgres is a
> backspace escape, not a boundary — it silently zeroed the wood-species, year, dimensions,
> weight and price counts. Re-run with `\y`. The figures above are the corrected ones.

### 1.5 Language observed in real descriptions

- *"designed by Foster + Partners for Molteni&C"* — designer **and** brand named in prose,
  neither stored anywhere.
- *"a series of interlocking upholstered units… a compact sectional, a linear composition,
  or a sweeping serpentine layout"* — configuration vocabulary, real and specific.
- *"high-resilience foam padding and premium leather upholstery"* — cushion fill is stated
  with grade, not just presence.
- *"solid ash wood stained in a coffee oak finish, with supporting structure elements in
  painted steel"* — frame material and finish are distinct from upholstery material.
- *"plush cushions upholstered in premium removable fabrics"* — removable cover.
- *"domestic and contract-friendly"* — contract vs residential grade appears in the wild.

---

## Step 2 — Proposed Attribute Definitions

Evidence bar used: **propose** where a live structured equivalent exists or ≥15% of the
relevant population supports it; **propose as optional and marked thin** below that;
**do not propose** at zero evidence unless it is a universal commercial expectation, in
which case it is called out explicitly as forward-looking.

### 2.1 Universal attributes — bind at the **Product root**

| # | attribute_key | label | data_type | unit_type | facet_eligible | seo_landing_eligible | required | ai_extractable | Live evidence |
|---|---|---|---|---|---|---|---|---|---|
| U1 | `brand` | Brand | `entity_ref` → Organization | — | yes | **yes** | **yes** | yes | `products.brand_profile_id` exists, **NULL ×33**; brand named in ~100% of descriptions (Molteni&C, De Sede, Flexform) |
| U2 | `designers` | Designer(s) | `multi_entity_ref` → Professional | — | yes | **yes** | no | yes | "designed by" in **19/33 (58%)**; `team_members` jsonb empty ×33 |
| U3 | `materials` | Materials | `multi_entity_ref` → `taxonomy_nodes(domain='material')` | — | yes | **yes** | no | yes | material dimension live with 95 assignments; `material_type` NULL ×33; leather 61%, fabric 52%, metal 30%, wood 18% |
| U4 | `color_family` | Colour family | `multi_enum` (or `color_ref`) | — | **yes** | yes | no | yes | **supersedes the `color-family` facet** — 12 Furniture assignments, 64 platform-wide; plus `products.color` / `color_options` (2 each). See flag B |
| U5 | `finish` | Finish / texture | `enum` | — | **yes** | no | no | yes | **supersedes the `finish-texture` facet** — 1 Furniture assignment, 14 platform-wide; "coffee oak finish", "stained", "painted steel" in prose |
| U6 | `country_of_origin` | Country of origin | `enum` (ISO 3166) | — | yes | yes | no | yes | "made in / manufactured in / produced in" **7/33 (21%)** |
| U7 | `year_designed` | Year designed | `number` | year | no | no | no | yes | `products.year` NULL ×33; year in text **7/33 (21%)** |
| U8 | `collection` | Collection / series | `text` or `entity_ref` | — | yes | yes | no | yes | **20/33 (61%)** — the strongest unclaimed universal signal. See flag I |
| U9 | `dimensions` | Dimensions (W×D×H) | `dimension` | mm | no | no | no | *low* | **2/33 (6%)** in text. Forward-looking — see flag D |
| U10 | `bim_cad_available` | BIM / CAD available | `multi_enum` (revit/dwg/ifc/3ds) | — | yes | no | no | **no** | **0/33** in text; `documents` jsonb empty ×33. Forward-looking — see flag D |

**Deliberately NOT proposed as attributes** (they are already taxonomy dimensions from
Phase 6 — creating attributes for them would duplicate the source of truth):

- **Style** → `taxonomy_nodes(domain='style')`, 16 nodes, 24 live assignments
- **Space Type** → `domain='space_type'`, 60 nodes
- **Sustainability** → `domain='sustainability'`, 6 nodes — *but see flag C, this one is
  genuinely ambiguous because the `sustainability` facet also survives with 5 assignments*

### 2.2 Furniture-domain attributes — bind at `furniture` (Domain 1 root)

| # | attribute_key | label | data_type | facet_eligible | seo_landing | required | Evidence |
|---|---|---|---|---|---|---|---|
| F1 | `is_upholstered` | Upholstered | `boolean` | yes | no | no | **23/33 (70%)** domain-wide; 20/23 Seating, 2/2 Beds, 1/7 Tables |
| F2 | `upholstery_material` | Upholstery material | `enum` (leather / fabric / bouclé / velvet / mesh / none) | **yes** | **yes** | no, conditional on F1 | leather 20/33, fabric 17/33. `conditional_requirement`: required when `is_upholstered = true`. See flag A |
| F3 | `frame_material` | Frame / structure material | `multi_entity_ref` → material | yes | no | no | "painted steel", "solid ash wood"; metal 30%, wood 18%. Distinct from U3 — see flag A |
| F4 | `base_type` | Base / leg type | `enum` (legs / pedestal / sled / swivel base / plinth / castors) | yes | no | no | **14/33 (42%)** — 9/23 Seating, 5/7 Tables |

### 2.3 Seating family — bind at `furniture/seating` (23 listings)

| # | attribute_key | label | data_type | unit | facet_eligible | seo_landing | required | Evidence |
|---|---|---|---|---|---|---|---|---|
| S1 | `cushion_fill` | Cushion fill | `enum` (HR foam / polyurethane foam / goose down / feather / fibre / hybrid) | — | yes | no | no | **22/23 (96%)** — the strongest Furniture-specific signal in the entire dataset |
| S2 | `is_modular` | Modular | `boolean` | — | **yes** | **yes** | no | **10/23 (43%)**, and **0** in every other family. See flag G — this is a *Seating* attribute, not a Sofa attribute |
| S3 | `has_armrests` | Armrests | `boolean` | — | yes | no | no | **9/23 (39%)**; also in titles ("Leather Armchair with Armrests", "Vale Beech Chair with Armrests") |
| S4 | `seat_capacity` | Seat capacity | `number` | persons | yes | **yes** | no | **2/23 (9%)** — thin. See flag H |
| S5 | `configuration` | Configuration | `multi_enum` (sectional / linear / serpentine / corner / chaise) | — | yes | yes | no | Named explicitly in DS-707; co-occurs with S2. Thin outside modular pieces |
| S6 | `is_reclining` | Reclining | `boolean` | — | no | no | no | **2/23 (9%)** — thin, title-supported ("A.B.C. Reclining Armchair") |
| S7 | `has_removable_cover` | Removable cover | `boolean` | — | yes | no | no | **2/33 (6%)** — thin, but explicit ("premium removable fabrics") |

### 2.4 Tables family — bind at `furniture/tables` (7 listings)

| # | attribute_key | label | data_type | facet_eligible | required | Evidence |
|---|---|---|---|---|---|---|
| T1 | `tabletop_material` | Tabletop material | `multi_entity_ref` → material | yes | no | Timber, leather, marble/stone all named. Distinct from F3 frame material |
| T2 | `table_shape` | Shape | `enum` (round / rectangular / oval / square / freeform) | **yes** | no | **5/7 (71%)**; title-supported ("DS-615 **Round** Leather Dining Table") |

**`is_extendable` is NOT proposed.** It returned **0/7** on Tables. The 2 domain-wide hits
were false positives — "extends" used figuratively in sofa copy. A plausible-sounding
attribute with zero live support is exactly what this exercise is meant to filter out.

### 2.5 Beds family — bind at `furniture/beds-bedroom` (2 listings)

**Nothing proposed.** Two listings is not an evidence base. `bed_size`, `headboard_type`
and `storage_base` are all plausible and all unsupported at n=2. See flag F.

### 2.6 Storage family

**Nothing proposed — zero listings.** See flag F.

---

## Step 3 — Migration notes

Two live datasets are superseded. Both follow the pattern proven in
`20260728201500_phase6_facet_migration` and `20260730100000_room_type_facet_retirement`:
**snapshot → migrate → guard → delete**, with the snapshot written before any destructive
statement and the guard aborting rather than proceeding with a gap.

### M1 — `color-family` facet → `color_family` attribute (U4)

**64 live assignments platform-wide, 12 on Furniture.** Exact value mapping:

| facet value | Furniture | Platform | → attribute value |
|---|---|---|---|
| brown | 4 | — | `brown` |
| black | 2 | — | `black` |
| gray | 1 | — | `gray` |
| green | 1 | — | `green` |
| natural | 1 | — | `natural` |
| other | 1 | — | `other` |
| silver | 1 | — | `silver` |
| wood | 1 | — | `wood` |

⚠️ **Do not scope this migration to Furniture.** The facet has 18 values and 64 assignments
across all domains; migrating only the Furniture subset would leave the facet half-alive
with no clean retirement point. Either migrate all 64 or defer the retirement entirely.

⚠️ `wood` and `natural` are **materials or finishes, not colours** — the same category
error the taxonomy work kept finding. They need a destination decision before migration,
not during. **Flagged, not resolved.**

### M2 — `finish-texture` facet → `finish` attribute (U5)

**14 live assignments platform-wide, 1 on Furniture** (`glossy`). Same all-or-nothing
caveat as M1.

### M3 — `products.color` / `products.color_options` → U4

Only **2 Furniture rows**: `serie 18` (`color='Brown'`, `color_options={Brown,Beige}`) and
`Nena Armchair` (`color='Black'`, `color_options={Black,Gray,Natural,Other,Orange}`).

⚠️ These **overlap** with the `color-family` facet on the same listings, and the values are
not identical in form (`'Brown'` vs `brown`). Three sources for one concept. See flag B.

### M4 — Nothing else migrates

`material_type`, `year`, `brand_profile_id`, `documents`, `team_members` are empty across
all 33. No migration; these become attribute/relationship targets populated going forward.

---

## Flags — decisions needed, not assumptions

**A. `materials` (U3) vs `upholstery_material` (F2) vs `frame_material` (F3).**
One product has several materials in different roles: *"solid ash wood… painted steel…
plush cushions upholstered in premium removable fabrics"*. Options: (a) one `materials`
multi_entity_ref with a role qualifier per value; (b) three separate attributes as proposed;
(c) `materials` universal + Furniture-specific role-scoped overrides. **(b) is proposed but
(a) is arguably cleaner and I do not want to lock it in silently.**

**B. Colour has three competing live sources** — the `color-family` facet (12 Furniture /
64 platform), `products.color` (2), `products.color_options` (2). Which is authoritative,
and is `color_family` an `enum` over a controlled list or the `color_ref` data type from the
Phase 7 list? `color_ref` implies a colour entity table that I found no evidence of.

**C. Sustainability is duplicated.** Phase 6 created 6 `sustainability` taxonomy nodes *and*
kept the `sustainability` facet (8 values, 5 assignments) as a Controlled Attribute. Under
Phase 7 that facet should presumably become an attribute — which would mean sustainability
exists as both a taxonomy dimension and an attribute. Needs a ruling.

**D. `dimensions` (U9) and `bim_cad_available` (U10) have ~zero live support** — 6% and 0%.
Both are standard commercial expectations for a specification platform, so I have proposed
them, but they are forward-looking: they cannot be backfilled from anything and would sit
empty until data entry changes. Keep, or defer to a later phase?

**E. Contract vs residential grade.** *"domestic and contract-friendly"* appears in real
copy and is a genuine specification axis in the furniture trade. Only 1 explicit hit, so I
have not proposed it — but it may be worth adding on domain knowledge rather than frequency.

**F. Beds (2 listings) and Storage (0 listings) have no evidence base.** Options: define
them now from domain knowledge and accept they are ungrounded; or leave Domain 1 partially
specified and revisit when listings exist. **Storage having zero listings while being a
core furniture family is itself worth noting** — it may indicate a cataloguing gap rather
than a taxonomy one.

**G. `is_modular` binds at Seating, not Sofa** — contradicting the example in the task
brief. Evidence: 10 hits across Seating, including armchairs, and **0** in every other
family. Confirm the correction.

**H. `seat_capacity` is thin (2/23)** despite being the brief's headline Seating example.
It is structurally important for sofas and trivially AI-extractable from titles
("Dwell **3-Seater** Fabric Sofa"). Proposed as optional — confirm that is right rather
than making it required at the Sofa type.

**I. `collection` (61%) — attribute or entity?** *"Atlante Light | Atlante Wood
collection"*, *"the Tibeau composition"*. If a Collection is a first-class thing with its
own page and members, it is an `entity_ref` to a new entity, not a `text` field — the same
distinction the brief draws for Designer and Brand. **This is the highest-value unclaimed
signal in the dataset and the decision shapes whether it gets SEO landing pages.**

**J. `is_derived` is unused in this proposal.** Nothing here is computed from other
attributes. If Phase 7 intends derived attributes (e.g. `seat_capacity` inferred from
`configuration`), that should be specified before definitions are written.

---

## Summary

- **10 universal** attributes at the Product root
- **4 Furniture-domain** attributes at `furniture`
- **7 Seating** attributes · **2 Tables** attributes
- **0 Beds, 0 Storage** — insufficient evidence, deliberately unproposed
- **2 facet migrations** specified (`color-family` 64, `finish-texture` 14) + 1 column
  migration (`products.color*`, 2 rows)
- **10 flags** for decision

**Nothing is written. No migration is prepared.** On approval — with letter answers to
flags A–J — the next step is the Attribute Definition rows plus the binding rows, prepared
as a review copy in `supabase/migrations-review/` before anything is applied.
