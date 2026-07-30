# Phase 6 — Supporting Dimensions: Creation Plan

**Status:** specification only. **Nothing applied.** Read-only verification against live schema.
**Goal:** create the 7 missing supporting taxonomy dimensions per the approved Phase 6 document.

---

## 1. Decisions recorded

| # | Decision |
|---|---|
| **D-5** | **Domain 10 — General Hardware & Fixings** created. Brackets, Supports, Mounts, Fixings (clip/fastener/hook), Architectural Ironmongery move there from Domain 4. Domain 4 retains only opening-related hardware, restoring its stated boundary. |
| **D-6** | **`screen` diverges into 3 slugs at creation** — never one shared node: `window-screen` → **Domain 4 › Windows**; `room-divider-screen` → **Domain 1 › Furniture** (new Type: *Room Divider*); `workstation-screen` → **Domain 9 › Partitions**. |
| **D-7** | **Deferred batch.** The 4 unclassified `outdoor`-root and 6 project-side contested assignments are combined into **one review task**, not touched now. **10 assignments total.** |

---

## 2. ⚠️ This is NOT a pure insert — two blockers

### 2.1 A CHECK constraint rejects 6 of the 7 dimensions

```sql
CHECK (domain = ANY (ARRAY['product', 'project', 'material', 'style']))
```

Only **`style`** is permitted today. `space_type`, `discipline`, `intervention_type`, `professional_role`, `organization_type`, `sustainability` would all fail on insert with `23514 check_violation`.

**A schema migration must precede any insert.**

### 2.2 Five columns Phase 6 §A.1 requires do not exist

Phase 6 §A.1 defines the shared Taxonomy Node shape as: *"label, dimension, slug, parent (nullable), **synonyms**, definition, **inclusion/exclusion criteria**, **external taxonomy mapping**, has_parent/has_child/**is_replaced_by**"*.

| Required field | Live column | Consequence if not added |
|---|---|---|
| `synonyms` | **missing** | Phases 4, 5 and 6 specify synonyms on *every* node. Unrecordable. |
| inclusion / exclusion criteria | **missing** | The boundary rules that make each node testable are unrecordable. |
| `replaced_by_id` (`is_replaced_by`) | **missing** | **Phase 6 §E demonstrates this mechanism concretely** — "Refurbishment" → `is_replaced_by` → "Renovation". That deprecation cannot be recorded at all. |
| `applies_to` | **missing** | **Phase 6 §H and §J both depend on it** — Professional Role targets `Project Credit.role`; Sustainability targets `Certification Program` / `Performance Metric`. Neither dimension can declare what it governs. |
| external taxonomy mapping | **missing** | Lower priority; no Phase 6 content requires it yet. |

Inserting without these means creating 133 nodes that are **structurally incomplete against the approved model** and would need a second backfill pass. Recommend adding the columns first.

### 2.3 Code-side typing must widen

| Location | Current | Needed |
|---|---|---|
| `taxonomyDb.ts:85` `getTaxonomyTree()` | `"product" \| "project" \| "material" \| "style"` | + 6 new dimensions |
| `taxonomyDb.ts:436` `getFacetsForDomain()` | `"product" \| "project"` | unchanged (facet-scoped) |
| `seedData.ts:10` | `"product" \| "project" \| "material"` | + new, if seeded via this path |
| `TaxonomyDbManager.tsx:101,289` (admin UI) | `"product" \| "project" \| "material"` | + new, or the admin panel cannot display them |

`getTaxonomyTree` is the read path. Without widening, the new dimensions are invisible to the app even once inserted.

---

## 3. Required migration (spec — not applied)

```sql
-- 1. widen the domain vocabulary
alter table public.taxonomy_nodes drop constraint taxonomy_nodes_domain_check;
alter table public.taxonomy_nodes add constraint taxonomy_nodes_domain_check
  check (domain = any (array[
    'product','project','material','style',
    'space_type','discipline','intervention_type',
    'professional_role','organization_type','sustainability'
  ]));

-- 2. add the Phase 6 §A.1 fields (all nullable — additive, no backfill required)
alter table public.taxonomy_nodes
  add column if not exists synonyms           text[] default '{}',
  add column if not exists inclusion_criteria text,
  add column if not exists exclusion_criteria text,
  add column if not exists replaced_by_id     uuid references public.taxonomy_nodes(id) on delete set null,
  add column if not exists applies_to         text[] default '{}';
```

**Additive and reversible.** Existing 963 rows are untouched; every new column is nullable or defaulted. Rollback is `drop column` + restore the old CHECK.

⚠️ `style` is already permitted by the existing constraint but has **zero rows** — it was anticipated in the schema and never populated.

---

## 4. Node counts to create

| Dimension | `domain` value | Families | Values | Total nodes | Depth |
|---|---|---|---|---|---|
| Space Type | `space_type` | 11 | 49 | **60** | 0–1 |
| Discipline | `discipline` | — | 11 | **11** | 0 |
| Style | `style` | — | 12 | **12** | 0 |
| Intervention Type | `intervention_type` | — | 6 (+1 deprecated) | **7** | 0 |
| Professional Role | `professional_role` | 6 | 21 | **27** | 0–1 |
| Organization Type | `organization_type` | — | 10 | **10** | 0 |
| Sustainability | `sustainability` | — | 6 | **6** | 0 |
| **Total** | | **17** | **116** | **133** | |

Depth stays within the existing `depth <= 3` CHECK. Uneven depth is by design (Phase 6 §A.6): Space Type and Professional Role are two-level; the other five are flat.

---

## 5. Notable content

**Intervention Type** — the only dimension needing `replaced_by_id` at creation. Phase 6 §E: **Refurbishment** is inserted as a deprecated node (`is_active = false`) with `replaced_by_id` → **Renovation**. This is the first real use of the mechanism, and it is the concrete reason column 2.2 matters.

**Professional Role** — `applies_to = ['project_credit']`, not an entity. Phase 6 §H is explicit that role is relationship metadata, not a Professional/Organization field.

**Sustainability** — `applies_to = ['certification_program','performance_metric']`.

**Style** — 12 values. ⚠️ Overlaps the live `facets/design-style` facet, which already carries assignments. See §6.

---

## 6. Still unresolved — facets vs taxonomy (from the Gap Report §6 item 8)

Three of the seven dimensions duplicate ground the live `facets` table already covers:

| Dimension | Competing live facet | Facet assignments |
|---|---|---|
| Style | `facets/design-style` | part of 108 total |
| Sustainability | `facets/sustainability` | " |
| Space Type | `facets/room-type` | " |

Creating these as `taxonomy_nodes` **without deciding this first builds a parallel duplicate** of a working mechanism — the same error being removed from the Product taxonomy (§8 of the Domains 3–7 pass, where 112 duplicate slugs were found).

**This should be decided before the inserts run**, not after. Options: (a) migrate facet values into taxonomy and retire the facets, (b) keep facets and treat §B/§D/§J as satisfied by a different mechanism, (c) create the taxonomy dimensions and dual-run temporarily.

Recommend **(a) or (b) before insert**; (c) reintroduces exactly the duplication just cleaned up.

---

## 7. Proposed sequence

1. **Decide facets vs taxonomy** (§6) — gates Style, Sustainability, Space Type = **78 of 133 nodes**.
2. **Apply the migration** (§3) — additive, reversible.
3. **Widen the TS unions** (§2.3) — otherwise the dimensions are invisible.
4. **Insert the 4 unblocked dimensions first**: Discipline (11), Intervention Type (7), Professional Role (27), Organization Type (10) = **55 nodes**. None conflict with facets.
5. **Insert the remaining 3** once §6 is settled = 78 nodes.
6. Verify: counts per domain, `replaced_by_id` resolves, `applies_to` populated, admin panel renders.

**Rollback:** all inserts are new rows in new `domain` values — `delete from taxonomy_nodes where domain in (...)` removes them with zero effect on the existing 963 rows or the 221 assignments. No listing references them until Phase 7/8 wires them up.

---

## 8. Decision log

1. **Domain 10 — General Hardware & Fixings created** (D-5); Domain 4's boundary restored.
2. **`screen` diverges into 3 slugs** across Domains 4, 1, 9 (D-6).
3. **10 contested assignments batched** into one deferred review task (D-7).
4. **"Pure insert" is not achievable** — a CHECK constraint blocks 6 of 7 dimensions and 5 Phase 6 §A.1 columns are absent.
5. **Migration specified as additive and reversible** (§3); no existing row is modified.
6. **133 nodes specified** across 7 dimensions.
7. **55 nodes are unblocked today**; 78 wait on the facets-vs-taxonomy decision.
8. **Facets overlap flagged as a gate, not a footnote** — proceeding without it rebuilds the duplication just removed.

**Not done:** no schema change, no insert, no code change.

---

# 9. Facet → taxonomy migration analysis (added after decision 3)

## 9.1 Correction: 30 assignments in scope, not 108

The 108 figure was the **whole** facets table. Only three facets migrate:

| Facet | Values | Assignments | Disposition |
|---|---|---|---|
| `design-style` | 12 | **24** | → migrate to `style` |
| `sustainability` | 8 | **5** | → migrate to `sustainability` ⚠️ blocked, §9.4 |
| `room-type` | 11 | **1** | → migrate to `space_type` ⚠️ §9.3 |
| **In scope** | | **30** | |
| `color-family` | 18 | 64 | **untouched** — Controlled Attribute |
| `finish-texture` | 10 | 14 | **untouched** — Phase 6 §G, correctly modelled |
| `architectural-element` | 10 | 0 | **untouched** |
| **Total** | | **108** | |

## 9.2 `design-style` → Style — ready, 2 decisions needed

**All 24 assignments land safely.** Both assigned values (`contemporary` 17, `minimalist` 7) are exact matches.

| Live value | Phase 6 §D | Status |
|---|---|---|
| contemporary (**17**), minimalist (**7**), mid-century-modern, scandinavian, industrial, art-deco | same | **Match ×6** |
| traditional | Traditional / Classic | Rename |
| rustic | Rustic / Farmhouse | Rename |
| **biophilic, brutalist, japanese, mediterranean** | — | **4 live orphans**, 0 assignments |
| — | **Modern, Coastal, Eclectic, Bohemian** | **4 approved values not live** |

**Decisions:** (a) add the 4 live orphans to Phase 6 §D, or drop them? They are legitimate style values a designer would use. (b) create the 4 approved-but-absent values? Zero cost either way.

## 9.3 `room-type` → Space Type — granularity mismatch

Live `room-type` is **coarser than Phase 6 §B by design** — 11 flat values vs 11 families / 49 leaf values.

| Live value | Phase 6 §B destination | Status |
|---|---|---|
| living-room, bedroom, bathroom, kitchen, dining-room | Residential Spaces › same | Match ×5 |
| hallway | Circulation & Support › Corridor | Rename |
| office | Workplace › Private Office **or** Residential › Home Office | **Ambiguous** |
| **outdoor** (**1 assignment**) | Outdoor Spaces — a **family**, not a leaf | ⚠️ **see below** |
| commercial-space, public-space | no equivalent — too coarse | **Unmappable** |
| other | no equivalent | Orphan |

⚠️ **The single assignment sits on `outdoor`, which maps to a Space Type *family*, not a leaf value.** Phase 6 §B's Outdoor Spaces family contains Terrace / Courtyard / Rooftop / Garden — the source data does not say which. This is the same class of problem as the deferred `outdoor` product root and `project/commercial`.

**Recommendation:** fold this 1 assignment into the **deferred batch (D-7)**, taking it from 10 to **11 assignments**. Migrating Space Type structure is fine; migrating this one assignment needs a human look.

## 9.4 ⚠️ `sustainability` → Sustainability — modelling mismatch, blocked

This is not a naming problem. **The two things classify different objects.**

Phase 6 §J's Sustainability taxonomy classifies **Certification Program** and **Performance Metric** *entities* (`applies_to = ['certification_program','performance_metric']`) into 6 browsable categories.

The live facet holds a **mix of two unrelated kinds of value**:

| Live value | What it actually is | Assignments |
|---|---|---|
| `fsc-certified` | a specific **Certification Program** | **3** |
| `cradle-to-cradle`, `energy-star`, `greenguard` | specific **Certification Programs** | 0 |
| `recycled-content`, `low-voc`, `biodegradable`, `locally-sourced` | **material/product attributes**, not certifications | **2** (biodegradable) |

Neither kind is a §J *category*. Migrating as instructed would require one of:

1. **Create Certification Program entities** for FSC, C2C, Energy Star, GREENGUARD — but **Phase 6 §A.3 forbids pre-populating entities speculatively**, and §J explicitly says it "does not create new entities."
2. **Mis-file attributes as taxonomy** — `low-voc` and `biodegradable` are product attributes; making them Sustainability taxonomy nodes reintroduces exactly the dimension-conflation Phase 1 §2 exists to prevent.
3. **Split the facet**: certifications → Certification Program entities (later, on real ingestion); attributes → stay a Controlled Attribute.

**Recommendation: option 3.** Create the 6 §J categories as taxonomy (they are correct and useful), but **do not migrate the facet values into them** — they aren't categories. Keep `sustainability` as a Controlled Attribute for now, exactly like `finish-texture`, and revisit when Certification Program entities exist.

That leaves the 5 assignments where they are, harming nothing. **Retiring the `sustainability` facet as instructed would strand them.**

## 9.5 Revised disposition

| Facet | Instruction | Recommendation | Assignments safe? |
|---|---|---|---|
| `design-style` | migrate + retire | **proceed** | ✅ 24 land exactly |
| `room-type` | migrate + retire | **migrate structure; defer the 1 assignment to D-7** | ✅ with deferral |
| `sustainability` | migrate + retire | ⚠️ **create §J categories, do NOT migrate values, do NOT retire the facet** | ❌ 5 stranded if retired |

**`listing_facets` → `listing_taxonomy_node`** is the mechanical path for the values that do migrate: insert one row per assignment with `is_primary = false`, matching how the 95 material assignments already work.
