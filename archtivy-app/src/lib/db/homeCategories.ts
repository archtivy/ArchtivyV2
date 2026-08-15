/**
 * Top-level project categories for the homepage category navigation strip.
 *
 * Same data pair the /projects hub already uses — getTaxonomyTree("project")
 * plus getNodeListingCountsWithDescendants("project") — wrapped in a single
 * cache entry so the homepage pays no per-request cost.
 *
 * Categories are real taxonomy nodes, so every strip item is a crawlable link
 * to an existing archive route (/projects/{slug_path}). No invented labels.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTaxonomyTree,
  getNodeListingCountsWithDescendants,
} from "@/lib/taxonomy/taxonomyDb";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";

export interface HomeCategory {
  id: string;
  label: string;
  slugPath: string;
  href: string;
  listingCount: number;
}

async function fetchHomeCategories(): Promise<HomeCategory[]> {
  try {
    const [treeRes, countsRes] = await Promise.all([
      getTaxonomyTree("project"),
      getNodeListingCountsWithDescendants("project"),
    ]);

    const nodes = treeRes.data ?? [];
    const counts = countsRes.data ?? {};

    return nodes
      .filter((n) => n.depth === 0)
      .map((n) => ({
        id: n.id,
        label: n.label,
        slugPath: n.slug_path,
        href: getArchiveCategoryUrl("project", n.slug_path),
        listingCount: counts[n.id] ?? 0,
      }))
      .sort((a, b) => {
        // Populated categories first — an empty category is a dead end for both
        // users and crawlers. Ties keep the taxonomy's own sort_order, which
        // getTaxonomyTree already applied.
        if (a.listingCount !== b.listingCount) return b.listingCount - a.listingCount;
        return 0;
      });
  } catch {
    return [];
  }
}

export const getHomeCategories = unstable_cache(
  fetchHomeCategories,
  ["home:categories:v1"],
  { tags: [CACHE_TAGS.listings], revalidate: 3600 }
);

/**
 * Popular search chips, derived from the most-populated real categories.
 * Never hardcoded terms — each chip runs a query that is guaranteed to return
 * results, because it is a category that already has listings.
 */
export function toPopularSearches(
  categories: HomeCategory[],
  limit = 6
): { label: string; href: string }[] {
  return categories
    .filter((c) => c.listingCount > 0)
    .slice(0, limit)
    .map((c) => ({ label: c.label, href: c.href }));
}
