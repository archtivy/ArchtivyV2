import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { syncCanonicalProductTaxonomy, backfillProductTaxonomyLinks } from "@/app/actions/taxonomySync";

/**
 * POST /api/admin/taxonomy-sync
 *
 * Runs the full taxonomy sync + backfill pipeline:
 * 1. syncCanonicalProductTaxonomy — ensures all canonical product paths exist in taxonomy_nodes
 * 2. backfillProductTaxonomyLinks — links unmapped products to taxonomy nodes
 *
 * Admin-only. Safe to run multiple times (idempotent).
 */
export async function POST() {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const syncResult = await syncCanonicalProductTaxonomy();
  const backfillResult = await backfillProductTaxonomyLinks();

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sync: syncResult,
    backfill: backfillResult,
    summary: {
      nodesCreated: syncResult.created,
      nodesUpdated: syncResult.updated,
      listingsLinked: backfillResult.linked,
      listingsSkipped: backfillResult.skipped,
      totalErrors: syncResult.errors.length + backfillResult.errors.length,
    },
  });
}
