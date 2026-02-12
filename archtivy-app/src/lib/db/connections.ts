/**
 * Single source of truth for connection counts.
 * Uses project_product_links: projects link to products (project_id, product_id).
 * - For a PROJECT: connection count = number of linked products.
 * - For a PRODUCT: connection count = number of linked projects.
 */

import {
  getConnectionCountsByProjectIds,
  getConnectionCountsByProductIds,
} from "@/lib/db/projectProductLinks";

export { getConnectionCountsByProjectIds, getConnectionCountsByProductIds };

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/**
 * Get connection counts for a set of listing IDs.
 * Projects (listings with type=project) use project_id in project_product_links.
 * Products use product_id in project_product_links.
 */
export async function getConnectionCountsByListingIds(
  listingIds: string[],
  type: "project" | "product"
): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {};
  const result =
    type === "project"
      ? await getConnectionCountsByProjectIds(listingIds)
      : await getConnectionCountsByProductIds(listingIds);
  return result.data ?? {};
}
