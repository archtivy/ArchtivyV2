/**
 * Card metrics: warm breakdown for ProjectCard and ProductCard.
 * Replaces "X connection(s)" with "N Products · M Team Members" etc.
 */

/** Pluralize: n === 1 ? singular : plural */
export function pluralize(
  n: number,
  singular: string,
  plural: string
): string {
  return n === 1 ? singular : plural;
}

/** Label for products count: "1 Product" | "X Products" */
export function productsLabel(n: number): string {
  return `${n} ${pluralize(n, "Product", "Products")}`;
}

/** Label for projects count: "1 Project" | "X Projects" */
export function projectsLabel(n: number): string {
  return `${n} ${pluralize(n, "Project", "Projects")}`;
}

/** Label for team count: "1 Team Member" | "X Team Members" */
export function teamLabel(n: number): string {
  return `${n} ${pluralize(n, "Team Member", "Team Members")}`;
}

/** Label for brands count: "1 Brand" | "X Brands" */
export function brandsLabel(n: number): string {
  return `${n} ${pluralize(n, "Brand", "Brands")}`;
}

/**
 * Build metrics string for ProjectCard.
 * Prefer productsCount if > 0, else brandsCount if > 0, plus teamCount.
 * Join non-zero parts with " · ". Returns null when all are 0/undefined.
 */
export function buildProjectCardMetrics(opts: {
  productsCount?: number;
  brandsCount?: number;
  teamCount?: number;
}): string | null {
  const { productsCount = 0, brandsCount = 0, teamCount = 0 } = opts;
  const parts: string[] = [];
  if (productsCount > 0) parts.push(productsLabel(productsCount));
  else if (brandsCount > 0) parts.push(brandsLabel(brandsCount));
  if (teamCount > 0) parts.push(teamLabel(teamCount));
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/**
 * Build metrics string for ProductCard.
 * projectsCount = used-in projects count
 * teamCount = team members credited (if product team exists)
 * Returns null when both are 0.
 */
export function buildProductCardMetrics(
  projectsCount: number,
  teamCount: number
): string | null {
  const parts: string[] = [];
  if (projectsCount > 0) {
    parts.push(`Used in ${projectsLabel(projectsCount)}`);
  }
  if (teamCount > 0) {
    parts.push(teamLabel(teamCount));
  }
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
