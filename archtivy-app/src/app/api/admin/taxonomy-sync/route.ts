import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { syncCanonicalProductTaxonomy } from "@/app/actions/taxonomySync";
import { runTaxonomyBackfill } from "@/lib/taxonomy/backfill";

/**
 * GET  /api/admin/taxonomy-sync           → dry-run preview (safe, no writes)
 * GET  /api/admin/taxonomy-sync?run=true  → full sync + backfill (writes)
 * POST /api/admin/taxonomy-sync           → full sync + backfill (writes)
 *
 * Admin-only. Safe to run multiple times (idempotent).
 */

export async function GET(request: Request) {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const url = new URL(request.url);
  const shouldRun = url.searchParams.get("run") === "true";

  if (!shouldRun) {
    // Dry-run: preview what backfill would do without writing
    const syncResult = await syncCanonicalProductTaxonomy();
    const dryRunResult = await runTaxonomyBackfill({ dryRun: true });

    return NextResponse.json({
      mode: "dry-run (add ?run=true to execute)",
      timestamp: new Date().toISOString(),
      sync: syncResult,
      backfill: {
        productsProcessed: dryRunResult.productsProcessed,
        productsWouldLink: dryRunResult.productsBackfilled,
        projectsProcessed: dryRunResult.projectsProcessed,
        projectsWouldLink: dryRunResult.projectsBackfilled,
        summary: dryRunResult.summary,
        mappings: dryRunResult.mappings,
        errors: dryRunResult.errors,
      },
    });
  }

  // Full run
  return runSyncAndBackfill();
}

export async function POST() {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;
  return runSyncAndBackfill();
}

async function runSyncAndBackfill() {
  const syncResult = await syncCanonicalProductTaxonomy();
  const backfillResult = await runTaxonomyBackfill();

  return NextResponse.json({
    mode: "executed",
    timestamp: new Date().toISOString(),
    sync: syncResult,
    backfill: {
      productsProcessed: backfillResult.productsProcessed,
      productsBackfilled: backfillResult.productsBackfilled,
      projectsProcessed: backfillResult.projectsProcessed,
      projectsBackfilled: backfillResult.projectsBackfilled,
      errors: backfillResult.errors,
    },
    summary: {
      nodesCreated: syncResult.created,
      nodesUpdated: syncResult.updated,
      productsLinked: backfillResult.productsBackfilled,
      projectsLinked: backfillResult.projectsBackfilled,
      totalErrors: syncResult.errors.length + backfillResult.errors.length,
    },
  });
}
