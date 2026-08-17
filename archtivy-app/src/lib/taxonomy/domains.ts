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
  // Enabled by 20260815100000_taxonomy_mood_domain (applied 2026-08-15), which
  // widened taxonomy_nodes_domain_check and seeded the ten terms.
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
 *
 * Empty as of 2026-08-15: 'mood' was the only entry and its migration is
 * applied. Kept rather than deleted — the next dimension will need exactly this
 * again, and the admin surface already reads it.
 */
export const PENDING_TAXONOMY_DOMAINS: readonly TaxonomyDomain[] = [];
