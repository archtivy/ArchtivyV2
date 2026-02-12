/**
 * Rebuild matches from scratch: aggregate embeddings per listing (avg), cosine similarity
 * all projects vs all products, upsert top N per project with tier (strong/likely/possible).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getImageAiForRebuild } from "@/lib/db/imageAi";
import { EMBEDDING_DIM } from "@/lib/matches/types";

const TOP_N_PER_PROJECT = 50;
const MIN_SCORE_POSSIBLE = 40;

/** Element-wise average of vectors, then L2-normalize for cosine. */
function averageEmbedding(vectors: number[][]): number[] {
  if (vectors.length === 0) return Array(EMBEDDING_DIM).fill(0);
  const dim = vectors[0].length;
  const sum = Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  for (let i = 0; i < dim; i++) sum[i] /= vectors.length;
  const norm = Math.sqrt(sum.reduce((a, x) => a + x * x, 0)) || 1;
  return sum.map((x) => x / norm);
}

/** Cosine similarity 0..1 (assumes vectors are L2-normalized). */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

function scoreToTier(score: number): "strong" | "likely" | "possible" | null {
  if (score >= 80) return "strong";
  if (score >= 60) return "likely";
  if (score >= MIN_SCORE_POSSIBLE) return "possible";
  return null;
}

interface ListingEmbedding {
  listingId: string;
  listingType: "project" | "product";
  avgEmbedding: number[];
  imageIds: string[];
  embeddingsByImageId: Map<string, number[]>;
}

export interface RebuildResult {
  runId: string;
  projectsCount: number;
  productsCount: number;
  matchesUpserted: number;
  matchesDeletedStale: number;
  errors: string[];
}

/**
 * Rebuild all matches from image_ai: aggregate avg embedding per listing, cosine all vs all,
 * top N per project, upsert with run_id; cleanup stale; log to matches_runs.
 */
export async function rebuildMatchesFromEmbeddings(): Promise<RebuildResult> {
  const sup = getSupabaseServiceClient();
  const runId = crypto.randomUUID();
  const errors: string[] = [];
  const now = new Date().toISOString();

  const logRun = async (patch: Record<string, unknown>) => {
    try {
      await sup.from("matches_runs").update(patch).eq("run_id", runId);
    } catch {
      // Table may not exist yet; non-fatal
    }
  };
  try {
    await sup.from("matches_runs").insert({
      run_id: runId,
      status: "started",
      started_at: now,
      projects_count: null,
      products_count: null,
      matches_upserted: null,
      matches_deleted_stale: null,
    });
  } catch {
    // matches_runs table may not exist; continue
  }

  try {
    const rows = await getImageAiForRebuild();
    const byKey = new Map<string, { embeddings: number[][]; imageIds: string[]; byImage: Map<string, number[]> }>();
    for (const r of rows) {
      const key = `${r.listing_type}:${r.listing_id}`;
      let group = byKey.get(key);
      if (!group) {
        group = { embeddings: [], imageIds: [], byImage: new Map() };
        byKey.set(key, group);
      }
      group.embeddings.push(r.embedding);
      group.imageIds.push(r.image_id);
      group.byImage.set(r.image_id, r.embedding);
    }

    const projectListings: ListingEmbedding[] = [];
    const productListings: ListingEmbedding[] = [];
    for (const [key, group] of byKey.entries()) {
      const [listingType, listingId] = key.split(":");
      const avgEmbedding = averageEmbedding(group.embeddings);
      const item: ListingEmbedding = {
        listingId,
        listingType: listingType as "project" | "product",
        avgEmbedding,
        imageIds: group.imageIds,
        embeddingsByImageId: group.byImage,
      };
      if (listingType === "project") projectListings.push(item);
      else productListings.push(item);
    }

    const projectIds = new Set(projectListings.map((p) => p.listingId));
    const productIds = new Set(productListings.map((p) => p.listingId));

    // Validate that these ids exist in listings/products (we only have image_ai data)
    const { data: existingProjects } = await sup.from("listings").select("id").eq("type", "project");
    const validProjectIds = new Set((existingProjects ?? []).map((r: { id: string }) => r.id));
    const { data: existingProducts } = await sup.from("products").select("id");
    const validProductIds = new Set((existingProducts ?? []).map((r: { id: string }) => r.id));

    const projectMap = new Map(projectListings.map((p) => [p.listingId, p]));
    const productMap = new Map(productListings.map((p) => [p.listingId, p]));

    const toUpsert: {
      project_id: string;
      product_id: string;
      score: number;
      tier: string;
      reasons: { type: string; score?: number }[];
      evidence_image_ids: string[];
    }[] = [];

    for (const proj of projectListings) {
      if (!validProjectIds.has(proj.listingId)) continue;
      const scores: { productId: string; score: number }[] = [];
      for (const prod of productListings) {
        if (!validProductIds.has(prod.listingId)) continue;
        const sim = cosineSimilarity(proj.avgEmbedding, prod.avgEmbedding);
        const score = Math.round(Math.min(100, sim * 100));
        scores.push({ productId: prod.listingId, score });
      }
      scores.sort((a, b) => b.score - a.score);
      const top = scores.slice(0, TOP_N_PER_PROJECT);
      for (const { productId, score } of top) {
        const tier = scoreToTier(score);
        if (!tier) continue;
        const prod = productMap.get(productId)!;
        const evidence = bestEvidencePair(proj, prod);
        toUpsert.push({
          project_id: proj.listingId,
          product_id: productId,
          score,
          tier,
          reasons: [{ type: "embedding", score }],
          evidence_image_ids: evidence,
        });
      }
    }

    // Delete stale matches (project or product no longer exists)
    const { data: staleProjectIds } = await sup
      .from("listings")
      .select("id")
      .eq("type", "project");
    const validP = new Set((staleProjectIds ?? []).map((r: { id: string }) => r.id));
    const { data: allMatches } = await sup.from("matches").select("project_id, product_id");
    const toDelete: { project_id: string; product_id: string }[] = [];
    for (const m of allMatches ?? []) {
      const row = m as { project_id: string; product_id: string };
      if (!validP.has(row.project_id) || !validProductIds.has(row.product_id)) {
        toDelete.push({ project_id: row.project_id, product_id: row.product_id });
      }
    }
    let matchesDeletedStale = 0;
    for (const { project_id, product_id } of toDelete) {
      const { error } = await sup.from("matches").delete().eq("project_id", project_id).eq("product_id", product_id);
      if (error) errors.push(`delete stale ${project_id}/${product_id}: ${error.message}`);
      else matchesDeletedStale++;
    }

    // Upsert new matches with this run_id
    let matchesUpserted = 0;
    for (const row of toUpsert) {
      const { error } = await sup.from("matches").upsert(
        {
          project_id: row.project_id,
          product_id: row.product_id,
          run_id: runId,
          score: row.score,
          tier: row.tier,
          reasons: row.reasons,
          evidence_image_ids: row.evidence_image_ids,
          updated_at: now,
        },
        { onConflict: "project_id,product_id" }
      );
      if (error) errors.push(`${row.project_id}/${row.product_id}: ${error.message}`);
      else matchesUpserted++;
    }

    // Remove old run_id rows for all projects we have embeddings for (so only this run remains)
    for (const proj of projectListings) {
      const { error } = await sup.from("matches").delete().eq("project_id", proj.listingId).neq("run_id", runId);
      if (error) errors.push(`delete old run for project ${proj.listingId}: ${error.message}`);
    }

    await logRun({
      status: "completed",
      completed_at: new Date().toISOString(),
      projects_count: projectIds.size,
      products_count: productIds.size,
      matches_upserted: matchesUpserted,
      matches_deleted_stale: matchesDeletedStale,
      error_message: errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
    });

    console.log("[rebuildMatches]", {
      runId,
      projectsCount: projectIds.size,
      productsCount: productIds.size,
      matchesUpserted,
      matchesDeletedStale,
    });

    return {
      runId,
      projectsCount: projectIds.size,
      productsCount: productIds.size,
      matchesUpserted,
      matchesDeletedStale,
      errors,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await sup.from("matches_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: msg,
      }).eq("run_id", runId);
    } catch {
      // non-fatal
    }
    console.error("[rebuildMatches] failed:", e);
    throw e;
  }
}

function bestEvidencePair(proj: ListingEmbedding, prod: ListingEmbedding): string[] {
  let bestSim = -1;
  let bestProjImg = proj.imageIds[0];
  let bestProdImg = prod.imageIds[0];
  for (const pid of proj.imageIds) {
    const pe = proj.embeddingsByImageId.get(pid);
    if (!pe) continue;
    for (const qid of prod.imageIds) {
      const qe = prod.embeddingsByImageId.get(qid);
      if (!qe) continue;
      const sim = cosineSimilarity(pe, qe);
      if (sim > bestSim) {
        bestSim = sim;
        bestProjImg = pid;
        bestProdImg = qid;
      }
    }
  }
  return [bestProjImg, bestProdImg].filter(Boolean);
}
