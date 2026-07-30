# Proposed code change — NOT APPLIED — awaiting review

**Purpose:** let the app read the 7 new Phase 6 taxonomy dimensions. Without this, the
dimensions exist in the database but are invisible to every code path.

**Order:** migration → code → inserts. Widening the types before the CHECK constraint is
widened is harmless (nothing calls it yet); the reverse is also harmless. But **inserting
before the code widens** means the nodes exist and cannot be read.

---

## 1. New shared type — `src/lib/taxonomy/domains.ts` (new file)

A single source of truth, so the union is not restated in four places and drift becomes
impossible.

```ts
/**
 * Taxonomy dimensions, matching the taxonomy_nodes_domain_check constraint.
 *
 * Keep in sync with migration 20260728_phase6_taxonomy_dimensions. Adding a value
 * here without widening the CHECK produces a runtime 23514 on insert; widening the
 * CHECK without adding it here makes the dimension unreadable.
 */
export const TAXONOMY_DOMAINS = [
  // Phase 4 / 5
  "project",
  "product",
  // Phase 6 supporting dimensions
  "material",
  "style",
  "space_type",
  "discipline",
  "intervention_type",
  "professional_role",
  "organization_type",
  "sustainability",
] as const;

export type TaxonomyDomain = (typeof TAXONOMY_DOMAINS)[number];

/** Dimensions that classify listings directly and appear in listing-facing UI. */
export const LISTING_TAXONOMY_DOMAINS = ["project", "product", "material"] as const;

/** Human labels for admin UI. */
export const TAXONOMY_DOMAIN_LABELS: Record<TaxonomyDomain, string> = {
  project: "Project Type",
  product: "Product",
  material: "Material",
  style: "Style",
  space_type: "Space Type",
  discipline: "Discipline",
  intervention_type: "Intervention Type",
  professional_role: "Professional Role",
  organization_type: "Organization Type",
  sustainability: "Sustainability",
};
```

## 2. `src/lib/taxonomy/taxonomyDb.ts`

**Line 85 — `getTaxonomyTree()`**

```diff
+import type { TaxonomyDomain } from "@/lib/taxonomy/domains";
+
 export async function getTaxonomyTree(
-  domain: "product" | "project" | "material" | "style"
+  domain: TaxonomyDomain
 ): Promise<DbResult<TaxonomyNode[]>> {
```

**`TaxonomyNode` interface — add the five new columns as optional**

Optional, not required, so existing construction sites keep compiling:

```diff
   featured_image?: string | null;
+  /* Phase 6 §A.1 node fields — added by 20260728_phase6_taxonomy_dimensions */
+  synonyms?: string[];
+  inclusion_criteria?: string | null;
+  exclusion_criteria?: string | null;
+  replaced_by_id?: string | null;
+  applies_to?: string[];
 }
```

⚠️ **`NODE_SELECT` (line 80–81) must also be extended**, or the new columns are silently
never fetched — exactly the failure mode that made the taxonomy SEO fields dead code for
two months:

```diff
 const NODE_SELECT =
-  "id, domain, parent_id, depth, slug, slug_path, label, label_plural, description, icon_key, sort_order, is_active, legacy_product_type, legacy_product_category, legacy_product_subcategory, legacy_project_category, created_at, updated_at";
+  "id, domain, parent_id, depth, slug, slug_path, label, label_plural, description, icon_key, sort_order, is_active, legacy_product_type, legacy_product_category, legacy_product_subcategory, legacy_project_category, created_at, updated_at, seo_title, meta_description, intro_text, featured_image, synonyms, inclusion_criteria, exclusion_criteria, replaced_by_id, applies_to";
```

Note this also fixes a **pre-existing** bug: `seo_title`, `meta_description`, `intro_text`
and `featured_image` were added to the table but never added to `NODE_SELECT`, so every
`node.seo_title || fallback` in the route files has always taken the fallback.

**Line 436 — `getFacetsForDomain()`** — leave as `"product" | "project"`. It queries
`facets.applies_to`, which is genuinely product/project-scoped. Not a taxonomy dimension.

## 3. `src/components/admin/TaxonomyDbManager.tsx`

Lines 101 and 289 hardcode three domains, so new dimensions would not render.

```diff
+import { TAXONOMY_DOMAINS, TAXONOMY_DOMAIN_LABELS, type TaxonomyDomain } from "@/lib/taxonomy/domains";
-  const [domainFilter, setDomainFilter] = useState<"product" | "project" | "material">("product");
+  const [domainFilter, setDomainFilter] = useState<TaxonomyDomain>("project");
```

```diff
-              onChange={(e) => setDomainFilter(e.target.value as "product" | "project" | "material")}
+              onChange={(e) => setDomainFilter(e.target.value as TaxonomyDomain)}
             >
-              <option value="product">Product</option>
-              <option value="project">Project</option>
-              <option value="material">Material</option>
+              {TAXONOMY_DOMAINS.map((d) => (
+                <option key={d} value={d}>{TAXONOMY_DOMAIN_LABELS[d]}</option>
+              ))}
```

Driving the options from the constant means the next dimension needs no UI change.

## 4. `src/lib/taxonomy/seedData.ts`

Line 10 types the seed row as `"product" | "project" | "material"`. **Leave it.** This file
seeds the *existing* product/project/material trees; the Phase 6 dimensions are inserted by
migration, not through this path. Widening it would imply seed coverage that does not exist.

---

## 5. Files changed

| File | Change |
|---|---|
| `src/lib/taxonomy/domains.ts` | **new** — single source of truth for the union |
| `src/lib/taxonomy/taxonomyDb.ts` | `getTaxonomyTree` signature, `TaxonomyNode` fields, `NODE_SELECT` |
| `src/components/admin/TaxonomyDbManager.tsx` | domain filter state + options from constant |

Three files. No behaviour change for existing dimensions — the union is widened, never
narrowed, and every new interface field is optional.

## 6. Verification after applying

- `tsc --noEmit` clean
- `next lint` no new warnings
- `next build` exit 0
- `getTaxonomyTree("discipline")` returns rows once inserted
- Admin taxonomy panel lists all 10 dimensions in the dropdown
- **Regression check:** a taxonomy archive page still renders — confirms the widened
  `NODE_SELECT` did not break the existing select (new columns must exist in the DB first,
  so this code must ship *after* the migration)
