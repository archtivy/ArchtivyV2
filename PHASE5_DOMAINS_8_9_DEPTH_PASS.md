# Phase 5 — Domains 8 & 9: Family → Type → Subtype Depth Pass

**Status:** Amendment to Phase 5 (Final Product Taxonomy). Supersedes the specific lines listed in §2.
**Governing inputs:** Phases 1–4 (locked), Phase 5 §A design rules (unchanged), Taxonomy Gap Report 2026-07-28.
**Grounding:** built from the live `taxonomy_nodes` trees (20 families / ~94 types across the two live Building Systems nodes plus Decor & Accessories), not designed from scratch. Every node below is annotated with its live origin so the migration is a mapping, not a rebuild.
**Out of scope:** database writes. Nothing here has been applied.

---

## 1. Decisions recorded

| # | Question | Decision |
|---|---|---|
| **4a** | Does Domain 9 cover non-MEP building systems? | **Broadened.** Domain 9 is **"Building Systems"**, not "Building Systems / MEP". Includes structural, facade, fire safety, acoustic, elevator, partitions, insulation/waterproofing, staircase systems alongside electrical/plumbing/HVAC. **Raw unfabricated construction materials remain separately excluded and open.** |
| **4b** | Where does `laundry-appliances` belong? | **Domain 5 — Kitchen & Bath Fixtures.** Removed from Building Systems. |
| **4c** | How do the two live Building Systems nodes merge? | **Per-family rules.** `av-media` is a true duplicate → keep one. **Both `plumbing` subtrees are retained as a union** — they are disjoint and complementary, not duplicates. |
| **5a** | Who owns Cushions & Pillows? | **Domain 6 — Textiles & Soft Furnishings, exclusively.** The `decor-accessories/cushions-throws` duplicate is removed (zero assignments). |

### Merge arithmetic (verified against live data)

| Live pair | A | B | Shared | Union | Result |
|---|---|---|---|---|---|
| `av-media` ↔ `av-media` | 4 | 4 | 4 | 4 | **Identical** — true duplicate, keep one |
| `electrical-smart` ↔ `electrical` + `home-automation` | 9 | 9 | 9 | 9 | **Identical** — `electrical-smart` is already the exact union; merge is lossless |
| `hvac` ↔ `hvac-climate` | 5 | 9 | 1 | 13 | Partial — union required |
| `plumbing` ↔ `plumbing` | 4 | 4 | **0** | 8 | **Disjoint** — union, never overwrite |
| `security` ↔ `security-access` | 4 | 4 | 3 | 5 | Partial — union required |

---

## 2. Corrections to the Phase 5 document

These three passages are stale and are superseded. **Nine domains is the operative count.**

| § | Was | Now |
|---|---|---|
| **§B heading** | "Seven Product Domains, scoped to what Archtivy actually needs to catalog…" | "**Nine** Product Domains, scoped to what Archtivy actually needs to catalog…" — the table gains rows 8 (Decor & Accessories) and 9 (Building Systems) |
| **§F title & framing** | "Domains 4–7 (Summary Level — Full Family/Type Detail Deferred)" and the MVP exclusion paragraph presenting Building Systems/MEP as "excluded from the Product taxonomy entirely" | Retitle "**Domains 4–7**". The exclusion paragraph is **historical record only** and no longer governs — Building Systems is Domain 9 per §I. Only **raw, unfabricated construction materials** remain excluded, and that remains open. |
| **§I closing line** | "…proceeds next, pending founder resolution of the open scope question in §I." | "…proceeds next. The Domain 8 / Domain 9 scope question in §I is **resolved**; the remaining open item is raw unfabricated construction materials, which does not block Phase 6." |

Also correct the §J closing sentence, which repeats the same stale "pending founder resolution" clause.

---

## 3. Domain 8 — Decor & Accessories

**Definition:** Decorative objects and accessories whose primary function is visual, ornamental, or ambient rather than structural, illuminative, or furnishing.

**Inclusion:** Freestanding and wall-mounted decorative items selected as part of an interior specification — vessels, objets, wall art, mirrors, clocks.

**Exclusion:**
- Soft goods (cushions, pillows, throws) → **Domain 6, Textiles & Soft Furnishings** (decision 5a)
- Items whose primary function is illumination → Domain 2, Lighting (a decorative table lamp is Lighting)
- Rigid items whose primary function is sitting/storage/work surface → Domain 1, Furniture
- Loose area rugs → Domain 6 (per Phase 5 §E's fitted/loose rule)

**Depth:** Domain → Family → Type. **No Subtype level** — per §A.1, subtypes are created only where a sub-format distinction is common in professional usage. Decor variation below Type is genuinely attribute-level (material, colour, size), not a recognised sub-format.

| Family | Type | Definition | Live origin | Assignments |
|---|---|---|---|---|
| **Decorative Objects** | Vase | A vessel whose primary function is displaying flowers or standing as an object | `decorative-objects/vase` | **5** |
| | Bowl | A decorative open vessel | `decorative-objects/bowl` | 0 |
| | Tray | A flat decorative carrying/display surface | `decorative-objects/tray` | 0 |
| | Candle Holder | A holder for candles as a decorative object | `decorative-objects/candle-holder` | 0 |
| | Figurine / Sculpture Object | A small freestanding decorative form | `decorative-objects/figurine` | 0 |
| **Wall Art** | Print | A framed or unframed two-dimensional reproduction | `wall-art/print` | 0 |
| | Wall Sculpture | A three-dimensional wall-mounted art object | `wall-art/sculpture` | 0 |
| | Tapestry | A woven textile art piece hung as wall art | `wall-art/tapestry` | 0 |
| | Wall Hanging | A non-woven decorative wall-mounted object | `wall-art/wall-hanging` | 0 |
| **Mirrors** | Wall Mirror | A mirror mounted to a wall | `mirrors/wall-mirror` | 0 |
| | Floor Mirror | A freestanding full-length mirror | `mirrors/floor-mirror` | 0 |
| | Vanity Mirror | A mirror designed for grooming, often lit or magnifying | `mirrors/vanity-mirror` | 0 |
| | Decorative Mirror | A mirror whose primary function is ornamental rather than reflective use | `mirrors/decorative-mirror` | 0 |
| **Clocks** | Wall Clock | A clock mounted to a wall | `clocks/wall-clock` | 0 |
| | Table Clock | A small freestanding clock for a surface | `clocks/table-clock` | 0 |
| | Mantel Clock | A clock designed for a mantelpiece or shelf | `clocks/mantel-clock` | 0 |

**Removed from live:** `cushions-throws` family (cushion, pillow, throw) → Domain 6 per decision 5a. Zero assignments; safe.

**Universal Domain 8 attributes:** Dimensions (W×D×H), Weight, Primary Material, Secondary Material, Colour, Finish (Attribute ref), Country of Origin, Sustainability Certification reference.

**Category-specific attributes:**
- *Decorative Objects:* Capacity/Volume (vessels), Set Quantity, Watertight (boolean, for vases/bowls)
- *Wall Art:* Framed (boolean), Frame Material, Orientation, Edition Type (open/limited), Mounting Hardware Included (boolean)
- *Mirrors:* Mirror Shape, Frame Material, Mounting Type, Magnification (vanity), Integrated Lighting (boolean), Glass Thickness
- *Clocks:* Movement Type (quartz/mechanical), Power Source, Numeral Style, Silent Movement (boolean)

---

## 4. Domain 9 — Building Systems

**Definition:** Products forming the technical, structural, and environmental systems of a building — the systems a building is *made of* and *runs on*, as opposed to the items placed within it.

**Inclusion (broadened per decision 4a):** electrical, plumbing, HVAC, controls/automation, fire safety, security, AV/communications, vertical transportation, structural systems, facade systems, acoustic systems, insulation & waterproofing, partitions, staircase systems.

**Exclusion:**
- **Raw, unfabricated construction materials** (bulk cement, aggregate, unmilled timber) — **remains excluded and open**, unchanged by decision 4a. The boundary: a *fabricated system or component* is Domain 9; the *substance it is made of* is a Material entity (Phase 2 §0.5)
- Appliances, including laundry → **Domain 5** (decision 4b)
- Loose furnishing items → Domains 1/6/8
- Illumination fixtures → Domain 2 (but *emergency/life-safety* lighting is Domain 9 › Fire Safety, resolving the Phase 5 §D exclusion)

**Depth:** uneven by design. Most families are Family → Type. **HVAC, Plumbing and Electrical carry a Subtype level** because their live type lists are long and flat enough to need functional grouping.

### 4.1 Family: Structural Systems

| Type | Definition | Live origin |
|---|---|---|
| Concrete Structure | Fabricated concrete structural components | `structural-systems/concrete-structure` |
| Steel Structure | Fabricated steel structural components | `structural-systems/steel-structure` |
| Timber Frame | Engineered timber structural framing systems | `structural-systems/timber-frame` |
| Foundation System | Fabricated foundation and substructure systems | `structural-systems/foundation-system` |

> **Boundary note:** these are *fabricated systems* (precast panels, structural steel assemblies, engineered timber frames), not bulk materials. Ready-mix concrete as a substance is a Material entity, not a Domain 9 Product.

### 4.2 Family: Facade Systems

| Type | Definition | Live origin |
|---|---|---|
| Curtain Wall | A non-loadbearing glazed facade system | `facade-systems/curtain-wall` |
| Rainscreen | A ventilated/drained facade cladding system | `facade-systems/rainscreen` |
| Cladding System | A facade covering system not classified as rainscreen or curtain wall | `facade-systems/cladding-system` |
| Shading System | An external solar-control facade element | `facade-systems/shading-system` |

### 4.3 Family: Electrical

| Type | Subtype | Live origin |
|---|---|---|
| Power Distribution | Distribution Board, Cable Management | `electrical-smart/distribution`, `/cable-management` |
| Wiring Devices | Socket, Switch, Dimmer | `electrical-smart/socket`, `/switch`, `/dimmer` |

### 4.4 Family: Controls & Building Automation

| Type | Subtype | Live origin |
|---|---|---|
| Control Devices | Controller, Thermostat | `electrical-smart/controller`, `/thermostat` |
| Sensors | Sensor | `electrical-smart/sensor` |
| Automation Hubs | Smart Home Hub | `electrical-smart/smart-home-hub` |

> Split from Electrical because they are distinct trades (cf. MasterFormat Div 26 Electrical vs Div 25 Integrated Automation). Live `electrical-smart` is the exact union of the two live variants, so nothing is lost in the split.

### 4.5 Family: HVAC

| Type | Subtype | Live origin |
|---|---|---|
| Heating Equipment | Heat Pump, Heating Element, Radiator, Underfloor Heating | `hvac-climate/heat-pump`, `/heating-element` (**4 assignments**), `/radiator`, `hvac/underfloor-heating` |
| Cooling Equipment | Air Conditioning Unit, Chiller | `hvac-climate/air-conditioning`, `hvac/chiller` |
| Air Distribution | Air Handling Unit, Ductwork, Grille, Vent, Ventilation Unit | `hvac/air-handling-unit`, `/ductwork`, `hvac-climate/grille`, `/vent`, `/ventilation` |
| Air Treatment | Heat Recovery Unit, Dehumidifier | `hvac/heat-recovery`, `hvac-climate/dehumidifier` |

All 13 union members placed; `underfloor-heating` deduplicated (appeared in both).

### 4.6 Family: Plumbing

**Union of both live subtrees — they are disjoint (decision 4c). All 8 types retained.**

| Type | Subtype | Live origin |
|---|---|---|
| Water Supply & Distribution | Water Supply, Pipework, Pipe Fitting, Valve | `bs/plumbing/water-supply`, `/pipework`, `st/plumbing/pipe-fitting`, `/valve` |
| Water Heating | Boiler, Water Heater | `st/plumbing/boiler`, `/water-heater` |
| Drainage | Drainage | `bs/plumbing/drainage` |
| Water Treatment | Water Treatment | `bs/plumbing/water-treatment` |

*(`bs` = `building-systems`, `st` = `systems-tech`)*

### 4.7 Family: Fire Safety

| Type | Definition | Live origin |
|---|---|---|
| Fire Detection & Alarm | Detection and alarm equipment | `fire-safety/fire-alarm` |
| Fire Suppression | Sprinkler and suppression systems | `fire-safety/sprinkler-system` |
| Smoke Control | Smoke extraction and ventilation | `fire-safety/smoke-extraction` |
| Fire-Rated Door | A door assembly with a certified fire rating | `fire-safety/fire-door` ⚠️ |
| Fire-Rated Glazing | A glazed assembly with a certified fire rating | `fire-safety/fire-rated-glass` ⚠️ |
| Emergency Lighting | Life-safety illumination | live `lighting/other-lighting/emergency-lighting` — **moved here** |

⚠️ See §5 overlap note.

### 4.8 Family: Security & Access Control

**Union of `security` + `security-access` (5 types).**

| Type | Live origin |
|---|---|
| Access Control System | `security/access-control` + `security-access/access-control` (dedup) |
| Electronic Lock | `security-access/electronic-lock` ⚠️ |
| CCTV / Surveillance | `security/cctv` |
| Intercom | both (dedup) |
| Security Alarm System | both (dedup) |

### 4.9 Family: AV & Communications

**True duplicate resolved — one copy kept (decision 4c).**

| Type | Live origin |
|---|---|
| Display | `av-media/display` |
| Speaker | `av-media/speaker` |
| AV Receiver | `av-media/av-receiver` |
| Mount / Bracket | `av-media/mount` |

### 4.10 Family: Vertical Transportation

| Type | Live origin |
|---|---|
| Passenger Elevator | `elevator-lift/passenger-elevator` |
| Freight Elevator | `elevator-lift/freight-elevator` |
| Escalator | `elevator-lift/escalator` |
| Platform Lift | `elevator-lift/platform-lift` |
| Dumbwaiter | `elevator-lift/dumbwaiter` |

### 4.11 Family: Acoustic Systems

| Type | Live origin |
|---|---|
| Acoustic Ceiling System | `acoustic-systems/acoustic-ceiling-system` |
| Acoustic Wall **System** | `acoustic-systems/acoustic-wall-panel` — **Surface Rule (D-3):** rated engineered system stays here; applied/decorative acoustic panel → **Domain 3 › Wall & Ceiling Finishes › Acoustic Panel** |
| Sound Insulation | `acoustic-systems/sound-insulation` |
| Vibration Isolation | `acoustic-systems/vibration-isolation` |

### 4.12 Family: Insulation & Waterproofing

| Type | Live origin |
|---|---|
| Batt Insulation | `insulation-waterproofing/batt-insulation` |
| Rigid Board Insulation | `/rigid-board-insulation` |
| Spray Foam Insulation | `/spray-foam-insulation` |
| Vapour Barrier | `/vapour-barrier` |
| Waterproofing Membrane | `/waterproofing-membrane` |

### 4.13 Family: Partitions

| Type | Live origin |
|---|---|
| Demountable Partition | `partitions/demountable-partition` |
| Operable Wall | `partitions/operable-wall` |
| ~~Glass Partition System~~ | **EXCLUDED (decision D-2)** — `glass-partition` is owned exclusively by **Domain 4 › Glass Partitions & Screens**, which holds the 1 live assignment. Live `partitions/glass-partition-system` is retired rather than duplicated; a redirect note points to Domain 4. |
| Toilet Partition | `partitions/toilet-partition` |

### 4.14 Family: Staircase Systems

| Type | Live origin | Assignments |
|---|---|---|
| Prefabricated Staircase | `staircase-systems/prefab-staircase` | **4** |
| Spiral Staircase | `/spiral-staircase` | 0 |
| Stair Railing / Balustrade | `/stair-railing` | 0 |
| Stair Nosing | `/stair-nosing` | 0 |

**Domain 9 totals:** 14 families, 56 Types/Subtypes. All 8 live assignments land: 4 on Staircase Systems › Prefabricated Staircase, 4 on HVAC › Heating Equipment › Heating Element.

**Universal Domain 9 attributes:** Dimensions, Weight, Primary Material, Country of Origin, Compliance/Certification reference (standard + rating), Indoor/Outdoor, Sustainability Certification reference, Warranty Period.

**Category-specific attributes:**
- *Electrical / Controls:* Voltage, Amperage, IP Rating, Mounting Type, Protocol (for automation), Poles/Ways
- *HVAC:* Capacity (kW), Airflow (m³/h), Energy Efficiency Rating, Refrigerant Type, Sound Power Level (dB(A))
- *Plumbing:* Flow Rate, Pressure Rating, Connection Size/Type, Material Grade
- *Fire Safety:* Fire Rating (minutes), Standard Compliance (e.g. EN/NFPA reference), Detection Type
- *Security & AV:* Power Source, Connectivity/Protocol, Resolution (imaging), Field of View
- *Vertical Transportation:* Rated Load (kg/persons), Speed (m/s), Travel Height, Door Type
- *Acoustic:* Sound Absorption (NRC / α_w), Sound Reduction (R_w, dB), Panel Thickness
- *Insulation & Waterproofing:* Thermal Conductivity (λ), R-Value, Thickness, Fire Class, Vapour Resistance
- *Structural:* Load Capacity, Span, Fire Rating, Section Profile
- *Facade:* U-Value, Wind Load Rating, Air/Water Tightness Class, System Depth
- *Partitions:* Acoustic Rating (R_w), Fire Rating, Panel Thickness, Operable (boolean)
- *Staircase:* Rise/Going, Load Rating, Balustrade Height, Tread Material

---

## 5. Cross-domain overlaps flagged (not resolved)

Broadening Domain 9 creates five boundary contacts with existing domains. All have **zero assignments**, so none blocks migration — but each needs an owner before nodes are created.

| Node | Domain 9 placement | Competing domain | Suggested rule |
|---|---|---|---|
| `fire-door` | 9 › Fire Safety | 4 — Doors, Windows & Hardware | Fire rating is the defining spec → Domain 9. Flag for confirmation. |
| `fire-rated-glass` | 9 › Fire Safety | 4 — Doors, Windows & Hardware | Same. |
| `electronic-lock` | 9 › Security & Access | 4 — Door/Window Hardware | Powered/networked → Domain 9; mechanical locks → Domain 4. |
| `acoustic-wall-panel` | 9 › Acoustic Systems | 3 — Surfaces & Finishes › Acoustic Panel | **RESOLVED (D-3).** Applied/decorative finish → Domain 3; engineered rated system → Domain 9. Codified as the Surface Rule — see `PHASE5_DOMAINS_3_7_DEPTH_PASS.md` §1.1. |
| `glass-partition-system` | ~~9 › Partitions~~ | **4 — Doors, Windows & Hardware** | **RESOLVED (D-2).** Domain 4 owns it exclusively; the Domain 9 node is not created. |

✅ **`glass-partition` — settled (D-2).** The 1 live assignment under `doors-windows/glass-partitions/glass-partition` stays put; Domain 4 is the exclusive owner and Domain 9 carries a redirect note instead of a competing node.

---

## 6. Live → approved migration map (Domains 8 & 9)

| Live node | Approved destination | Action | Assignments |
|---|---|---|---|
| `decor-accessories` | Domain 8 | Adopt as Domain root | 0 |
| `decor-accessories/cushions-throws` (+3 types) | Domain 6 | **Retire from D8** | 0 |
| `decor-accessories/*` (4 remaining families, 16 types) | Domain 8 families | Adopt, rename to approved labels | **5** |
| `building-systems` | Domain 9 | **Adopt as Domain root** | 0 |
| `systems-tech` | — | **Retire** after union merge | 0 |
| `systems-tech/av-media` | — | **Drop** (identical to `building-systems/av-media`) | 0 |
| `systems-tech/electrical` + `/home-automation` | — | **Drop** (exact subset of `electrical-smart`) | 0 |
| `systems-tech/hvac-climate` | D9 › HVAC | **Union** into HVAC | **4** |
| `systems-tech/plumbing` | D9 › Plumbing | **Union** — retain all 4 types | 0 |
| `systems-tech/security-access` | D9 › Security & Access | **Union** (adds `electronic-lock`) | 0 |
| `systems-tech/laundry-appliances` | **Domain 5** | **Reparent** (decision 4b) | 0 |
| `building-systems/*` (13 families) | D9 families | Adopt, restructure per §4 | **4** |
| `lighting/other-lighting/emergency-lighting` | D9 › Fire Safety › Emergency Lighting | **Reparent** | 0 |

**Net:** 2 live top-level nodes → 1 approved Domain. Zero assignments lost. Zero require human re-pointing — all 8 land on an unambiguous destination.

---

## 7. Decision log

1. **Domain 9 is "Building Systems", broadened beyond MEP** (4a) — 14 families covering structural, facade, electrical, controls, HVAC, plumbing, fire safety, security, AV, vertical transport, acoustic, insulation/waterproofing, partitions, staircases.
2. **Raw unfabricated construction materials remain excluded and open** — unchanged. The fabricated-system vs substance boundary is stated in §4's exclusion list.
3. **`laundry-appliances` moves to Domain 5** (4b).
4. **`av-media` deduplicated; both `plumbing` subtrees unioned** (4c) — verified disjoint (0 shared, 8 union), so a blanket reparent would have destroyed 4 types.
5. **`electrical-smart` proved to be the exact union** of `electrical` + `home-automation` (9 = 9), then re-split into Electrical and Controls & Building Automation on trade lines. Lossless.
6. **Cushions & Pillows belong to Domain 6 only** (5a); the Domain 8 duplicate is retired.
7. **Emergency lighting relocated** from Domain 2 (where Phase 5 §D excluded it without a destination) to Domain 9 › Fire Safety — closing a gap rather than creating one.
8. **Domain 8 has no Subtype level** by design (§A.1/§A.4) — decor variation below Type is attribute-level.
9. **Five cross-domain overlaps flagged, none resolved unilaterally** (§5). Only `glass-partition` has a live assignment attached.
10. **Phase 5 §B / §F / §I / §J corrections recorded** (§2). Nine domains is the operative count.

**Not done:** no `taxonomy_nodes` row was created, renamed, or retired. This document is a specification for that work, not the work itself.
