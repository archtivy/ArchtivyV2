/**
 * Server-side data fetchers for archive pages.
 * Resolves taxonomy nodes and fetches filtered listings.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getTaxonomyNodeBySlugPath,
  getTaxonomyAncestors,
  getChildNodes,
  getNodeListingCountsWithDescendants,
  type TaxonomyNode,
} from "@/lib/taxonomy/taxonomyDb";
import {
  getProjectsCanonicalFiltered,
  getProductsCanonicalFiltered,
} from "@/lib/db/explore";
import { DEFAULT_PROJECT_FILTERS, DEFAULT_PRODUCT_FILTERS } from "@/lib/exploreFilters";
import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";
import type { SubcategoryLinkItem } from "@/components/archive/SubcategoryLinks";

export const ARCHIVE_PAGE_SIZE = 24;

export interface ArchiveData<T> {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  childNodes: SubcategoryLinkItem[];
  /**
   * Peer categories under the same parent, already filtered to those that have
   * at least one approved listing behind them and with this node removed.
   *
   * Empty on a root node, which has no peers worth listing — its siblings are
   * the whole top level of the taxonomy, and that is what the Category pill in
   * the filter bar is for. Populated on a subcategory, where "other things in
   * Commercial" is a genuine next step.
   */
  siblingNodes: SubcategoryLinkItem[];
  listings: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Resolve a project taxonomy node by slug_path and fetch listings.
 * Returns null if the slug_path does not match a project taxonomy node.
 */
export async function fetchProjectArchive(
  slugPath: string,
  page = 1
): Promise<ArchiveData<ProjectCanonical> | null> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * ARCHIVE_PAGE_SIZE;

  return unstable_cache(
    async () => {
      const nodeRes = await getTaxonomyNodeBySlugPath("project", slugPath);
      if (!nodeRes.data) return null;
      const node = nodeRes.data;

      const [ancestorsRes, childrenRes, listingsRes, countsRes] = await Promise.all([
        getTaxonomyAncestors("project", slugPath),
        getChildNodes(node.id),
        getProjectsCanonicalFiltered({
          filters: { ...DEFAULT_PROJECT_FILTERS, taxonomy: slugPath },
          limit: ARCHIVE_PAGE_SIZE,
          offset,
          sort: "newest",
        }),
        getNodeListingCountsWithDescendants("project"),
      ]);

      const counts = countsRes.data ?? {};

      const childNodes: SubcategoryLinkItem[] = (childrenRes.data ?? []).map((c) => ({
        label: c.label,
        slug_path: c.slug_path,
        description: c.description,
        listing_count: counts[c.id] ?? 0,
      }));

      /*
       * Peers, for the related-categories block under the results.
       *
       * Fetched here rather than in the component because the rolled-up counts
       * are already in hand: the filter below is what keeps this from becoming
       * a wall of links to empty pages. Only 15 of the 103 live project
       * subcategories and 29 of the 505 product ones have any approved listing
       * behind them, so an unfiltered sibling list would be mostly dead ends.
       *
       * One extra query, and only for a node that has a parent.
       */
      const siblingsRes = node.parent_id
        ? await getChildNodes(node.parent_id)
        : { data: [], error: null };
      const siblingNodes: SubcategoryLinkItem[] = (siblingsRes.data ?? [])
        .filter((s) => s.id !== node.id)
        .map((s) => ({
          label: s.label,
          slug_path: s.slug_path,
          description: s.description,
          listing_count: counts[s.id] ?? 0,
        }))
        .filter((s) => (s.listing_count ?? 0) > 0);

      const total = listingsRes.total;
      const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));

      return {
        node,
        ancestors: ancestorsRes.data ?? [],
        childNodes,
        siblingNodes,
        listings: listingsRes.data,
        total,
        page: safePage,
        totalPages,
      };
    },
    [`archive:project:${slugPath}:p${safePage}`],
    { tags: [CACHE_TAGS.listings], revalidate: 3600 }
  )();
}

/**
 * Resolve a product taxonomy node by slug_path and fetch listings.
 * Returns null if the slug_path does not match a product taxonomy node.
 */
export async function fetchProductArchive(
  slugPath: string,
  page = 1
): Promise<ArchiveData<ProductCanonical> | null> {
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * ARCHIVE_PAGE_SIZE;

  return unstable_cache(
    async () => {
      const nodeRes = await getTaxonomyNodeBySlugPath("product", slugPath);
      if (!nodeRes.data) return null;
      const node = nodeRes.data;

      const [ancestorsRes, childrenRes, listingsRes, countsRes] = await Promise.all([
        getTaxonomyAncestors("product", slugPath),
        getChildNodes(node.id),
        getProductsCanonicalFiltered({
          filters: { ...DEFAULT_PRODUCT_FILTERS, taxonomy: slugPath },
          limit: ARCHIVE_PAGE_SIZE,
          offset,
          sort: "newest",
        }),
        getNodeListingCountsWithDescendants("product"),
      ]);

      const counts = countsRes.data ?? {};

      const childNodes: SubcategoryLinkItem[] = (childrenRes.data ?? []).map((c) => ({
        label: c.label,
        slug_path: c.slug_path,
        description: c.description,
        listing_count: counts[c.id] ?? 0,
      }));

      /*
       * Peers, for the related-categories block under the results.
       *
       * Fetched here rather than in the component because the rolled-up counts
       * are already in hand: the filter below is what keeps this from becoming
       * a wall of links to empty pages. Only 15 of the 103 live project
       * subcategories and 29 of the 505 product ones have any approved listing
       * behind them, so an unfiltered sibling list would be mostly dead ends.
       *
       * One extra query, and only for a node that has a parent.
       */
      const siblingsRes = node.parent_id
        ? await getChildNodes(node.parent_id)
        : { data: [], error: null };
      const siblingNodes: SubcategoryLinkItem[] = (siblingsRes.data ?? [])
        .filter((s) => s.id !== node.id)
        .map((s) => ({
          label: s.label,
          slug_path: s.slug_path,
          description: s.description,
          listing_count: counts[s.id] ?? 0,
        }))
        .filter((s) => (s.listing_count ?? 0) > 0);

      const total = listingsRes.total;
      const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));

      return {
        node,
        ancestors: ancestorsRes.data ?? [],
        childNodes,
        siblingNodes,
        listings: listingsRes.data,
        total,
        page: safePage,
        totalPages,
      };
    },
    [`archive:product:${slugPath}:p${safePage}`],
    { tags: [CACHE_TAGS.listings], revalidate: 3600 }
  )();
}

/**
 * Quick check: does a slug_path match a project taxonomy node?
 * Cheaper than fetchProjectArchive since it skips listings.
 */
export async function isProjectTaxonomySlug(slug: string): Promise<boolean> {
  const res = await getTaxonomyNodeBySlugPath("project", slug);
  return res.data !== null;
}

/**
 * Quick check: does a slug_path match a product taxonomy node?
 */
export async function isProductTaxonomySlug(slug: string): Promise<boolean> {
  const res = await getTaxonomyNodeBySlugPath("product", slug);
  return res.data !== null;
}
