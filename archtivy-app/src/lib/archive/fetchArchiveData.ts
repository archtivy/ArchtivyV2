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
  children: SubcategoryLinkItem[];
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

      const children: SubcategoryLinkItem[] = (childrenRes.data ?? []).map((c) => ({
        label: c.label,
        slug_path: c.slug_path,
        description: c.description,
        listing_count: (countsRes.data ?? {})[c.id] ?? 0,
      }));

      const total = listingsRes.total;
      const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));

      return {
        node,
        ancestors: ancestorsRes.data ?? [],
        children,
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

      const children: SubcategoryLinkItem[] = (childrenRes.data ?? []).map((c) => ({
        label: c.label,
        slug_path: c.slug_path,
        description: c.description,
        listing_count: (countsRes.data ?? {})[c.id] ?? 0,
      }));

      const total = listingsRes.total;
      const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));

      return {
        node,
        ancestors: ancestorsRes.data ?? [],
        children,
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
