"use server";

/**
 * Admin-only backfill action: populates taxonomy_node_id on existing listings
 * by matching legacy text columns to taxonomy_nodes.legacy_* columns.
 *
 * Safe to run multiple times — only processes listings with NULL taxonomy_node_id.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { findNodeByLegacyProduct, findNodeByLegacyProject, setListingTaxonomyNode } from "./taxonomyDb";

const BATCH_SIZE = 100;

export interface BackfillMapping {
  listing_id: string;
  listing_type: "product" | "project";
  legacy_category: string;
  mapped_node_slug_path: string | null;
  status: "mapped_exact" | "mapped_to_parent" | "no_match" | "skipped";
}

export interface BackfillSummary {
  mapped_exact: number;
  mapped_to_parent: number;
  no_match: number;
  skipped: number;
}

export interface BackfillStats {
  productsProcessed: number;
  productsBackfilled: number;
  projectsProcessed: number;
  projectsBackfilled: number;
  errors: string[];
  /** Only populated when dryRun=true */
  mappings?: BackfillMapping[];
  /** Only populated when dryRun=true */
  summary?: BackfillSummary;
}

export interface BackfillOptions {
  /** When true, outputs mappings without writing to DB */
  dryRun?: boolean;
}

/**
 * Run the full backfill. Returns stats.
 * Call this from the admin taxonomies page.
 *
 * @param options.dryRun – When true, outputs listing_id → taxonomy_node mapping
 *   without writing to the DB. Use this to preview changes before committing.
 */
export async function runTaxonomyBackfill(options?: BackfillOptions): Promise<BackfillStats> {
  const dryRun = options?.dryRun ?? false;

  const stats: BackfillStats = {
    productsProcessed: 0,
    productsBackfilled: 0,
    projectsProcessed: 0,
    projectsBackfilled: 0,
    errors: [],
    mappings: dryRun ? [] : undefined,
  };

  const supa = getSupabaseServiceClient();

  // ── Backfill products ────────────────────────────────────────────────────
  let productOffset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data: batch, error } = await supa
      .from("listings")
      .select("id, product_type, product_category, product_subcategory")
      .eq("type", "product")
      .is("taxonomy_node_id", null)
      .is("deleted_at", null)
      .range(productOffset, productOffset + BATCH_SIZE - 1);

    if (error) {
      stats.errors.push(`Product fetch error at offset ${productOffset}: ${error.message}`);
      break;
    }

    const rows = (batch ?? []) as {
      id: string;
      product_type: string | null;
      product_category: string | null;
      product_subcategory: string | null;
    }[];

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      stats.productsProcessed++;
      if (!row.product_type) {
        if (dryRun) {
          stats.mappings!.push({ listing_id: row.id, listing_type: "product", legacy_category: "(none)", mapped_node_slug_path: null, status: "skipped" });
        }
        continue;
      }

      // Find deepest matching node, tracking match depth for reporting
      let nodeId: string | null = null;
      let slugPath: string | null = null;
      let matchedExact = false;
      const legacyDepth = [row.product_type, row.product_category, row.product_subcategory].filter(Boolean).length;

      if (row.product_subcategory && row.product_category) {
        const res = await findNodeByLegacyProduct(row.product_type, row.product_category, row.product_subcategory);
        nodeId = res.data?.id ?? null;
        slugPath = res.data?.slug_path ?? null;
        if (nodeId) matchedExact = true;
      }
      if (!nodeId && row.product_category) {
        const res = await findNodeByLegacyProduct(row.product_type, row.product_category);
        nodeId = res.data?.id ?? null;
        slugPath = res.data?.slug_path ?? null;
        // Exact if listing only had type+category
        if (nodeId && legacyDepth <= 2) matchedExact = true;
      }
      if (!nodeId) {
        const res = await findNodeByLegacyProduct(row.product_type);
        nodeId = res.data?.id ?? null;
        slugPath = res.data?.slug_path ?? null;
        if (nodeId && legacyDepth <= 1) matchedExact = true;
      }

      const legacyStr = [row.product_type, row.product_category, row.product_subcategory].filter(Boolean).join("/");
      const mappingStatus: BackfillMapping["status"] = nodeId
        ? matchedExact ? "mapped_exact" : "mapped_to_parent"
        : "no_match";

      if (dryRun) {
        stats.mappings!.push({
          listing_id: row.id,
          listing_type: "product",
          legacy_category: legacyStr,
          mapped_node_slug_path: slugPath,
          status: mappingStatus,
        });
        if (nodeId) stats.productsBackfilled++;
      } else if (nodeId) {
        const setRes = await setListingTaxonomyNode(row.id, nodeId);
        if (setRes.error) {
          stats.errors.push(`Product ${row.id}: ${setRes.error}`);
        } else {
          stats.productsBackfilled++;
        }
      }
    }

    if (rows.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      productOffset += BATCH_SIZE;
    }
  }

  // ── Backfill projects ────────────────────────────────────────────────────
  let projectOffset = 0;
  hasMore = true;
  while (hasMore) {
    const { data: batch, error } = await supa
      .from("listings")
      .select("id, category")
      .eq("type", "project")
      .is("taxonomy_node_id", null)
      .is("deleted_at", null)
      .range(projectOffset, projectOffset + BATCH_SIZE - 1);

    if (error) {
      stats.errors.push(`Project fetch error at offset ${projectOffset}: ${error.message}`);
      break;
    }

    const rows = (batch ?? []) as { id: string; category: string | null }[];

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    for (const row of rows) {
      stats.projectsProcessed++;
      if (!row.category) {
        if (dryRun) {
          stats.mappings!.push({ listing_id: row.id, listing_type: "project", legacy_category: "(none)", mapped_node_slug_path: null, status: "skipped" });
        }
        continue;
      }

      const res = await findNodeByLegacyProject(row.category);
      const nodeId = res.data?.id ?? null;
      const slugPath = res.data?.slug_path ?? null;

      if (dryRun) {
        stats.mappings!.push({
          listing_id: row.id,
          listing_type: "project",
          legacy_category: row.category,
          mapped_node_slug_path: slugPath,
          status: nodeId ? "mapped_exact" : "no_match",
        });
        if (nodeId) stats.projectsBackfilled++;
      } else if (nodeId) {
        const setRes = await setListingTaxonomyNode(row.id, nodeId);
        if (setRes.error) {
          stats.errors.push(`Project ${row.id}: ${setRes.error}`);
        } else {
          stats.projectsBackfilled++;
        }
      }
    }

    if (rows.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      projectOffset += BATCH_SIZE;
    }
  }

  // Compute summary counts for dry-run mode
  if (dryRun && stats.mappings) {
    stats.summary = {
      mapped_exact: stats.mappings.filter((m) => m.status === "mapped_exact").length,
      mapped_to_parent: stats.mappings.filter((m) => m.status === "mapped_to_parent").length,
      no_match: stats.mappings.filter((m) => m.status === "no_match").length,
      skipped: stats.mappings.filter((m) => m.status === "skipped").length,
    };
  }

  // Revalidate caches (skip in dry-run mode — no writes were made)
  if (!dryRun) {
    revalidateTag(CACHE_TAGS.listings);
  }

  return stats;
}
