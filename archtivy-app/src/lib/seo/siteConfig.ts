/**
 * Site-level constants for SEO and structured data.
 * Update social profile URLs as Archtivy establishes presence on each platform.
 */

export const SITE_NAME = "Archtivy";

export const SITE_DESCRIPTION =
  "The platform where architectural work is documented, products are credited, and professionals connect across cities.";

/**
 * Archtivy's own social profile URLs for Organization schema sameAs.
 * Add URLs as accounts are created. Empty strings are filtered out at build time.
 */
export const SOCIAL_PROFILES: string[] = [
  // "https://www.instagram.com/archtivy",
  // "https://www.linkedin.com/company/archtivy",
  // "https://x.com/archtivy",
].filter(Boolean);

/**
 * Organization founding date (ISO 8601).
 * Used in Organization JSON-LD for knowledge panel eligibility.
 */
export const FOUNDING_DATE = "2024";
