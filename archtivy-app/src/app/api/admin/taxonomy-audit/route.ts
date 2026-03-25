import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { PRODUCT_TAXONOMY, PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID } from "@/lib/taxonomy/productTaxonomy";

/**
 * GET /api/admin/taxonomy-audit
 *
 * Returns a comprehensive validation report of the taxonomy system.
 * Admin-only. Use this after running syncCanonicalProductTaxonomy + backfillProductTaxonomyLinks.
 */
export async function GET() {
  try {
  const authResult = await requireAdminApi();
  if (authResult instanceof NextResponse) return authResult;

  const sup = getSupabaseServiceClient();

  // ── 1. Product listings: taxonomy_node_id coverage ───────────────────

  const [prodTotal, prodWith, prodWithout] = await Promise.all([
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "product").eq("status", "APPROVED").is("deleted_at", null),
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "product").eq("status", "APPROVED").is("deleted_at", null)
      .not("taxonomy_node_id", "is", null),
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "product").eq("status", "APPROVED").is("deleted_at", null)
      .is("taxonomy_node_id", null),
  ]);

  if (prodTotal.error || prodWith.error || prodWithout.error) {
    return NextResponse.json({
      error: "Product count query failed",
      details: [prodTotal.error?.message, prodWith.error?.message, prodWithout.error?.message].filter(Boolean),
    }, { status: 500 });
  }

  const totalProducts = prodTotal.count ?? 0;
  const productsWithNode = prodWith.count ?? 0;
  const productsWithoutNode = prodWithout.count ?? 0;

  // ── 2. Project listings: taxonomy_node_id coverage ───────────────────

  const [projTotal, projWith, projWithout] = await Promise.all([
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "project").eq("status", "APPROVED").is("deleted_at", null),
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "project").eq("status", "APPROVED").is("deleted_at", null)
      .not("taxonomy_node_id", "is", null),
    sup.from("listings").select("id", { count: "exact", head: true })
      .eq("type", "project").eq("status", "APPROVED").is("deleted_at", null)
      .is("taxonomy_node_id", null),
  ]);

  if (projTotal.error || projWith.error || projWithout.error) {
    return NextResponse.json({
      error: "Project count query failed",
      details: [projTotal.error?.message, projWith.error?.message, projWithout.error?.message].filter(Boolean),
    }, { status: 500 });
  }

  const totalProjects = projTotal.count ?? 0;
  const projectsWithNode = projWith.count ?? 0;
  const projectsWithoutNode = projWithout.count ?? 0;

  // ── 3. Unmapped product listings: sample of what couldn't be linked ──

  const { data: unmappedSample } = await sup
    .from("listings")
    .select("id, title, product_type, product_category, product_subcategory")
    .eq("type", "product").eq("status", "APPROVED").is("deleted_at", null)
    .is("taxonomy_node_id", null)
    .limit(20);

  // ── 4. Canonical paths vs DB nodes ───────────────────────────────────

  // Build all canonical paths from productTaxonomy.ts
  const canonicalPaths: string[] = [];
  for (const type of PRODUCT_TAXONOMY) {
    canonicalPaths.push(type.id);
    for (const cat of type.categories) {
      canonicalPaths.push(`${type.id}/${cat.id}`);
      for (const sub of cat.subcategories) {
        if (sub.id !== PRODUCT_TAXONOMY_FALLBACK_SUBCATEGORY_ID) {
          canonicalPaths.push(`${type.id}/${cat.id}/${sub.id}`);
        }
      }
    }
  }

  // Check which exist in DB
  const { data: existingNodes } = await sup
    .from("taxonomy_nodes")
    .select("slug_path, legacy_product_type, legacy_product_category, legacy_product_subcategory")
    .eq("domain", "product")
    .eq("is_active", true);

  const existingPathSet = new Set((existingNodes ?? []).map((n) => n.slug_path));
  const missingPaths = canonicalPaths.filter((p) => !existingPathSet.has(p));

  // Check for nodes with missing legacy mappings
  const nodesWithoutLegacy = (existingNodes ?? []).filter(
    (n) => !n.legacy_product_type
  );

  // ── 5. Project taxonomy node coverage ────────────────────────────────

  const { data: projectNodes } = await sup
    .from("taxonomy_nodes")
    .select("id, slug_path, label, depth")
    .eq("domain", "project")
    .eq("is_active", true)
    .order("depth")
    .order("slug_path");

  // ── 6. Junction table consistency ────────────────────────────────────

  // Count listings that have taxonomy_node_id set but no matching junction row
  let orphanedNodeIds: number | null = null;
  try {
    const { count } = await sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .not("taxonomy_node_id", "is", null)
      .eq("status", "APPROVED")
      .is("deleted_at", null);
    // If we had a way to anti-join listing_taxonomy_node, we would.
    // For now, just report that we have N listings with taxonomy_node_id set.
    orphanedNodeIds = null; // Not cheaply queryable without RPC
    void count; // suppress unused
  } catch {
    orphanedNodeIds = null;
  }

  // ── 7. Summary ───────────────────────────────────────────────────────

  return NextResponse.json({
    timestamp: new Date().toISOString(),

    products: {
      total: totalProducts ?? 0,
      withTaxonomyNode: productsWithNode ?? 0,
      withoutTaxonomyNode: productsWithoutNode ?? 0,
      coveragePercent: totalProducts
        ? Math.round(((productsWithNode ?? 0) / (totalProducts as number)) * 100)
        : 0,
      unmappedSample: unmappedSample ?? [],
    },

    projects: {
      total: totalProjects ?? 0,
      withTaxonomyNode: projectsWithNode ?? 0,
      withoutTaxonomyNode: projectsWithoutNode ?? 0,
      coveragePercent: totalProjects
        ? Math.round(((projectsWithNode ?? 0) / (totalProjects as number)) * 100)
        : 0,
    },

    canonicalProductTaxonomy: {
      totalCanonicalPaths: canonicalPaths.length,
      existingInDb: existingPathSet.size,
      missingFromDb: missingPaths.length,
      missingPaths: missingPaths.slice(0, 50),
      nodesWithoutLegacyMapping: nodesWithoutLegacy.length,
    },

    projectTaxonomy: {
      totalNodes: projectNodes?.length ?? 0,
      nodes: (projectNodes ?? []).map((n) => ({
        slug_path: n.slug_path,
        label: n.label,
        depth: n.depth,
      })),
    },

    junctionTableOrphanCount: orphanedNodeIds,

    validationChecklist: {
      "1_products_have_taxonomy_node_id": (productsWithoutNode ?? 0) === 0
        ? "PASS — all products linked"
        : `WARN — ${productsWithoutNode} products still unmapped`,
      "2_all_canonical_paths_in_db": missingPaths.length === 0
        ? "PASS — all canonical paths exist in taxonomy_nodes"
        : `FAIL — ${missingPaths.length} paths missing (run syncCanonicalProductTaxonomy)`,
      "3_legacy_mappings_present": nodesWithoutLegacy.length === 0
        ? "PASS — all nodes have legacy_product_type"
        : `WARN — ${nodesWithoutLegacy.length} nodes without legacy mapping`,
      "4_projects_have_taxonomy_node_id": (projectsWithoutNode ?? 0) === 0
        ? "PASS — all projects linked"
        : `WARN — ${projectsWithoutNode} projects still unmapped`,
    },
  });
  } catch (err) {
    console.error("[taxonomy-audit] Unhandled error:", err);
    return NextResponse.json(
      { error: "Taxonomy audit failed", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
