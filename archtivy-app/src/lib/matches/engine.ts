/**
 * Matches engine: compute project ↔ product scores using pgvector HNSW nearest-neighbor
 * search (cosine) and attribute overlap. Safe writes via run_id.
 *
 * Tier: verified if score >= 80 OR (score >= 70 AND frequency >= 2);
 *       possible if 60 <= score < verified.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProjectImageRefs } from "@/lib/db/matches";
import { getImageAiBatch, matchProductImagesByEmbedding } from "@/lib/db/imageAi";
import type { MatchReason } from "@/lib/matches/types";
import { taxonomyMatchScore, type ProductTaxonomyFields } from "@/lib/matches/taxonomyScore";

const SCORE_VERIFIED_HIGH = 80;
const SCORE_VERIFIED_LOW = 70;
const FREQUENCY_VERIFIED = 2;
// DEV ONLY: lowered threshold to verify pipeline
const SCORE_POSSIBLE_MIN = 25;
const NN_TOP_K = 50;
const EMBEDDING_WEIGHT = 0.7;
const ATTRIBUTE_WEIGHT = 0.3;
const FREQUENCY_BONUS_CAP = 10;
const FREQUENCY_BONUS_PER_HIT = 2;

/** Cosine distance (0..2 for normalized vectors) → similarity 0..100. */
function distanceToScore(distance: number): number {
  const similarity = Math.max(0, 1 - distance);
  return Math.round(Math.min(100, similarity * 100));
}

function attributeOverlap(attrsA: Record<string, unknown>, attrsB: Record<string, unknown>): number {
  const keys = ["category", "material", "color", "context"] as const;
  let total = 0;
  let count = 0;
  for (const k of keys) {
    const arrA = attrsA[k] as unknown;
    const arrB = attrsB[k] as unknown;
    if (!Array.isArray(arrA) || !Array.isArray(arrB)) continue;
    const setB = new Set((arrB as string[]).map((x) => String(x).toLowerCase()));
    let hits = 0;
    for (const v of arrA as string[]) {
      if (setB.has(String(v).toLowerCase())) hits++;
    }
    const maxLen = Math.max(arrA.length, arrB.length, 1);
    total += (hits / maxLen) * 100;
    count++;
  }
  return count === 0 ? 0 : Math.round(total / count);
}

export interface PairScore {
  embeddingScore: number;
  attributeScore: number;
  combined: number;
  projectImageId: string;
  productImageId: string;
}

function scorePair(
  projAttrs: Record<string, unknown>,
  prodAttrs: Record<string, unknown>,
  distance: number,
  projectImageId: string,
  productImageId: string
): PairScore {
  const emb = distanceToScore(distance);
  const attr = attributeOverlap(projAttrs, prodAttrs);
  const combined = Math.round(emb * EMBEDDING_WEIGHT + attr * ATTRIBUTE_WEIGHT);
  return {
    embeddingScore: emb,
    attributeScore: attr,
    combined: Math.min(100, combined),
    projectImageId,
    productImageId,
  };
}

export interface MatchCandidate {
  projectId: string;
  productId: string;
  scores: PairScore[];
  aggregateScore: number;
  frequency: number;
}

/**
 * Compute match candidates for one project using NN over product image embeddings.
 * For each project image, fetches top K product images by cosine distance (HNSW),
 * then scores by embedding + attributes and aggregates by product with frequency bonus.
 */
export async function computeCandidatesForProject(
  projectId: string,
  _productIds?: string[]
): Promise<MatchCandidate[]> {
  const projRefs = await getProjectImageRefs(projectId);
  if (projRefs.length === 0) return [];
  const projectAiMap = await getImageAiBatch(
    projRefs.map((r) => r.image_id),
    "project"
  );

  const pairByProduct = new Map<
    string,
    { productId: string; pairs: PairScore[] }
  >();

  for (const pr of projRefs) {
    const projAi = projectAiMap.get(pr.image_id);
    if (!projAi?.embedding) continue;

    const nnRows = await matchProductImagesByEmbedding(projAi.embedding, NN_TOP_K);
    for (const row of nnRows) {
      const pair = scorePair(
        projAi.attrs,
        row.attrs,
        row.distance,
        pr.image_id,
        row.image_id
      );
      if (pair.combined < SCORE_POSSIBLE_MIN) continue;

      const existing = pairByProduct.get(row.product_id);
      if (!existing) {
        pairByProduct.set(row.product_id, { productId: row.product_id, pairs: [pair] });
      } else {
        existing.pairs.push(pair);
      }
    }
  }

  const candidates: MatchCandidate[] = [];
  for (const { productId, pairs } of Array.from(pairByProduct.values())) {
    const best = pairs.reduce((a: PairScore, b: PairScore) => (a.combined > b.combined ? a : b));
    const frequency = pairs.length;
    const frequencyBonus = Math.min(FREQUENCY_BONUS_CAP, frequency * FREQUENCY_BONUS_PER_HIT);
    let aggregateScore = Math.min(100, best.combined + frequencyBonus);
    candidates.push({
      projectId,
      productId,
      scores: pairs,
      aggregateScore,
      frequency,
    });
  }

  const withTaxonomy = await addTaxonomyBonusToCandidates(projectId, candidates);
  return withTaxonomy;
}

/**
 * Add taxonomy match bonus to candidates using project's linked products.
 * Does not replace existing score; combined with embedding/attribute logic.
 */
async function addTaxonomyBonusToCandidates(
  projectId: string,
  candidates: MatchCandidate[]
): Promise<MatchCandidate[]> {
  if (candidates.length === 0) return candidates;
  const sup = getSupabaseServiceClient();
  const { data: links } = await sup
    .from("project_product_links")
    .select("product_id")
    .eq("project_id", projectId);
  const linkedIds = Array.from(new Set((links ?? []).map((r) => (r as { product_id: string }).product_id).filter(Boolean)));
  const candidateIds = candidates.map((c) => c.productId);
  const allIds = Array.from(new Set([...linkedIds, ...candidateIds]));
  if (allIds.length === 0) return candidates;

  const { data: rows } = await sup
    .from("listings")
    .select("id, product_type, product_category, product_subcategory")
    .in("id", allIds)
    .eq("type", "product");
  const taxonomyByProductId = new Map<string, ProductTaxonomyFields>();
  for (const row of rows ?? []) {
    const r = row as { id: string; product_type?: string | null; product_category?: string | null; product_subcategory?: string | null };
    taxonomyByProductId.set(r.id, {
      product_type: r.product_type ?? null,
      product_category: r.product_category ?? null,
      product_subcategory: r.product_subcategory ?? null,
    });
  }

  const linkedTaxonomies = linkedIds
    .map((id) => taxonomyByProductId.get(id))
    .filter((t): t is ProductTaxonomyFields => t != null);

  return candidates.map((c) => {
    const candidateTax = taxonomyByProductId.get(c.productId);
    if (!candidateTax || linkedTaxonomies.length === 0) return c;
    let taxonomyBonus = 0;
    for (const linkedTax of linkedTaxonomies) {
      const s = taxonomyMatchScore(linkedTax, candidateTax);
      if (s > taxonomyBonus) taxonomyBonus = s;
    }
    // Scale taxonomy (0–100) to a max +30 bonus so it acts as a tie-breaker, not dominant vs embedding/attributes.
    const scaledBonus = Math.round((taxonomyBonus / 100) * 30);
    const aggregateScore = Math.min(100, c.aggregateScore + scaledBonus);
    return { ...c, aggregateScore };
  });
}

function tierFromScore(aggregateScore: number, frequency: number): "verified" | "possible" | null {
  const verified =
    aggregateScore >= SCORE_VERIFIED_HIGH ||
    (aggregateScore >= SCORE_VERIFIED_LOW && frequency >= FREQUENCY_VERIFIED);
  if (verified) return "verified";
  if (aggregateScore >= SCORE_POSSIBLE_MIN) return "possible";
  return null;
}

function buildReasons(scores: PairScore[], frequency: number): MatchReason[] {
  const best = scores.reduce((a, b) => (a.combined > b.combined ? a : b));
  const reasons: MatchReason[] = [];
  if (best.embeddingScore > 0) reasons.push({ type: "embedding", score: best.embeddingScore });
  if (best.attributeScore > 0) reasons.push({ type: "attribute", score: best.attributeScore, matches: [] });
  reasons.push({ type: "frequency", score: frequency });
  return reasons;
}

/** Project image IDs that contributed to this match (evidence). */
function evidenceProjectImageIds(scores: PairScore[]): string[] {
  return Array.from(new Set(scores.map((s) => s.projectImageId)));
}

/**
 * Compute matches for one project (NN-based), then upsert with run_id and safe-delete old rows.
 * Generates one run_id per run; after upsert, deletes only matches for this project where run_id != current.
 */
export async function computeAndUpsertMatchesForProject(
  projectId: string,
  productIds?: string[]
): Promise<{ upserted: number; errors: string[] }> {
  const sup = getSupabaseServiceClient();
  const runId = crypto.randomUUID();
  const candidates = await computeCandidatesForProject(projectId, productIds);

  const errors: string[] = [];
  let upserted = 0;

  for (const c of candidates) {
    const tier = tierFromScore(c.aggregateScore, c.frequency);
    if (!tier) continue;
    const evidenceImageIds = evidenceProjectImageIds(c.scores);
    const reasons = buildReasons(c.scores, c.frequency);
    const { error } = await sup
      .from("matches")
      .upsert(
        {
          project_id: c.projectId,
          product_id: c.productId,
          run_id: runId,
          score: c.aggregateScore,
          tier,
          reasons,
          evidence_image_ids: evidenceImageIds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,product_id" }
      );
    if (error) errors.push(`${c.productId}: ${error.message}`);
    else upserted++;
  }

  const { error: deleteError } = await sup
    .from("matches")
    .delete()
    .eq("project_id", projectId)
    .neq("run_id", runId);
  if (deleteError) errors.push(`delete old runs: ${deleteError.message}`);

  return { upserted, errors };
}

/**
 * Recompute matches for all projects (batch). Use for backfill or cron.
 */
export async function computeAndUpsertAllMatches(): Promise<{
  projectsProcessed: number;
  totalUpserted: number;
  errors: string[];
}> {
  const { getAllProjectIds } = await import("@/lib/db/matches");
  const projectIds = await getAllProjectIds();
  const errors: string[] = [];
  let totalUpserted = 0;
  for (const projectId of projectIds) {
    const { upserted, errors: e } = await computeAndUpsertMatchesForProject(projectId);
    totalUpserted += upserted;
    errors.push(...e);
  }
  return { projectsProcessed: projectIds.length, totalUpserted, errors };
}
