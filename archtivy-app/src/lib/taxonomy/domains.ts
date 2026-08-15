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
  // Phase 7 — atmosphere/feel, the dimension the Inspiration System has
  // referenced since its spec without ever having an authoring surface.
  //
  // GATED ON A MIGRATION. taxonomy_nodes_domain_check does not yet permit
  // 'mood'; until 20260815100000_taxonomy_mood_domain is applied, the Mood
  // option appears in the admin domain picker but any insert fails with a
  // 23514 that the Add-term form surfaces verbatim. Listing it here first is
  // deliberate — it is the only consumer (verified: nothing else reads this
  // constant), so the surface can be reviewed before the data lands.
  "mood",
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
  mood: "Mood",
};

/**
 * Domains whose CHECK constraint has not been widened in the live database yet.
 * The admin surface uses this to say so plainly rather than letting an operator
 * discover it through a raw Postgres error.
 */
export const PENDING_TAXONOMY_DOMAINS: readonly TaxonomyDomain[] = ["mood"];
