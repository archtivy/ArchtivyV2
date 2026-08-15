/**
 * Shared numeric formatting for platform counters.
 *
 * Extracted from ExploreCountsHero / ExploreEditorialHeader, which each had a
 * private copy of the same function. Behaviour is unchanged so those surfaces
 * keep rendering identically.
 */

/** Compact count: 1234 -> "1.2k", 1200000 -> "1.2M", 42 -> "42". */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Grouped count: 1234 -> "1,234".
 *
 * Preferred for the hero statistics rail. At Archtivy's current scale every
 * total is well under 1,000, where formatCount() and this agree — but as the
 * archive grows, "1,247 Projects" reads as a real inventory figure whereas
 * "1.2k Projects" reads as a rounded marketing number.
 */
export function formatExactCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
