/**
 * POST /api/admin/matches-test
 * Validates Matches Engine: runs pipeline + matching for one project and a few products, returns query results.
 * Body (optional): { projectId?: string, productIds?: string[] }
 * If omitted, picks one project and up to 3 products from DB.
 */
import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processProjectImages, processProductImages } from "@/lib/matches/pipeline";
import { computeAndUpsertMatchesForProject } from "@/lib/matches/engine";
import { getProjectMatches, getProductMatchedProjects } from "@/lib/matches/queries";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    let projectId = body.projectId as string | undefined;
    let productIds = body.productIds as string[] | undefined;
    const sup = getSupabaseServiceClient();

    if (!projectId) {
      const { data: listings } = await sup.from("listings").select("id").eq("type", "project").limit(1);
      projectId = listings?.[0]?.id;
    }
    if (!productIds?.length) {
      const { data: products } = await sup.from("products").select("id").limit(3);
      productIds = (products ?? []).map((p: { id: string }) => p.id);
    }

    if (!projectId) {
      return Response.json({ error: "No project found. Create a project first." }, { status: 400 });
    }
    if (!productIds?.length) {
      return Response.json({ error: "No products found. Create at least one product." }, { status: 400 });
    }

    const projectProcess = await processProjectImages(projectId);
    const productProcesses: { productId: string; processed: number; errors: string[] }[] = [];
    for (const productId of productIds) {
      const r = await processProductImages(productId);
      productProcesses.push({ productId, processed: r.processed, errors: r.errors });
    }

    const { upserted, errors: matchErrors } = await computeAndUpsertMatchesForProject(projectId, productIds);

    const { data: projectMatches, total: projectTotal } = await getProjectMatches({
      projectId,
      tier: "all",
      limit: 20,
    });
    const firstProductId = productIds[0];
    const { data: productMatchedProjects, total: productTotal } = await getProductMatchedProjects({
      productId: firstProductId,
      tier: "all",
      limit: 20,
    });

    return Response.json({
      projectId,
      productIds,
      pipeline: {
        projectImagesProcessed: projectProcess.processed,
        projectErrors: projectProcess.errors,
        productResults: productProcesses,
      },
      matching: { upserted, errors: matchErrors },
      getProjectMatches: { total: projectTotal, data: projectMatches },
      getProductMatchedProjects: { productId: firstProductId, total: productTotal, data: productMatchedProjects },
    });
  } catch (e) {
    console.error("[matches-test]", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
