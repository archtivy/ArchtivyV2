/**
 * Shared vocabulary for taxonomy follow lookups.
 *
 * A follow row is keyed in the database on (follower_profile_id, target_type,
 * target_id) — a single node id. The UI, however, addresses a node by
 * (domain, slug_path), because that is what a filter chip carries. This module
 * owns the translation between the two so the batch endpoint and its callers
 * cannot disagree about what identifies a follow.
 *
 * Same discipline as lib/notifications/tabs.ts: one definition imported by both
 * sides, rather than a string format duplicated in a component and a route.
 */

export type TaxonomyFollowTargetType = "category" | "material";

export interface TaxonomyFollowTarget {
  targetType: TaxonomyFollowTargetType;
  /** taxonomy_nodes.slug_path, e.g. "furniture/seating" or "concrete". */
  slugPath: string;
  /** taxonomy_nodes.domain — "product", "project" or "material". */
  domain: string;
}

/**
 * Stable string identity for a target.
 *
 * `|` is safe as a separator: slug_path is built from url slugs (a-z, 0-9, `-`)
 * joined by `/`, and domain is one of a fixed enum, so neither can contain it.
 */
export function taxonomyFollowKey(t: TaxonomyFollowTarget): string {
  return `${t.targetType}|${t.domain}|${t.slugPath}`;
}

/** Drop duplicate targets, preserving first-seen order. */
export function dedupeTaxonomyFollowTargets(
  targets: TaxonomyFollowTarget[]
): TaxonomyFollowTarget[] {
  const seen = new Set<string>();
  const out: TaxonomyFollowTarget[] = [];
  for (const t of targets) {
    const k = taxonomyFollowKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Upper bound on how many targets one batch request may carry.
 *
 * Explore allows multi-select on materials with no cap, so a pathological URL
 * could otherwise ask the server to resolve hundreds of nodes in one call. The
 * limit is applied server-side; anything beyond it is simply not reported as
 * followed, which fails closed to "Follow" rather than to a wrong "Following".
 */
export const MAX_TAXONOMY_FOLLOW_TARGETS = 50;
