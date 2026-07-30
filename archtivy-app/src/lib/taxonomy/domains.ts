/**
 * Taxonomy dimensions, matching the taxonomy_nodes_domain_check constraint.
 *
 * Keep in sync with migration 20260728200000_phase6_taxonomy_dimensions. Adding a
 * value here without widening the CHECK produces a runtime 23514 on insert;
 * widening the CHECK without adding it here makes the dimension unreadable.
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
