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
import { upsertPhotoMatchesBatch, deleteStalePhotoMatches, type PhotoMatchUpsert } from "@/lib/db/photoMatches";

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

/* ── Photo-level auto-selection thresholds ── */
const PHOTO_AUTO_SELECT_SCORE = 85;
const PHOTO_AUTO_SELECT_GAP = 10;
const PHOTO_AUTO_SELECT_KEYWORDS = 5;
const PHOTO_AUTO_SELECT_MAX = 6;

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
  /** Count of individual shared keywords across all attribute arrays. */
  sharedKeywordCount: number;
}

/** Count individual shared keywords across category/material/color/context. */
function countSharedKeywords(attrsA: Record<string, unknown>, attrsB: Record<string, unknown>): number {
  const keys = ["category", "material", "color", "context"] as const;
  let count = 0;
  for (const k of keys) {
    const arrA = attrsA[k] as unknown;
    const arrB = attrsB[k] as unknown;
    if (!Array.isArray(arrA) || !Array.isArray(arrB)) continue;
    const setB = new Set((arrB as string[]).map((x) => String(x).toLowerCase()));
    for (const v of arrA as string[]) {
      if (setB.has(String(v).toLowerCase())) count++;
    }
  }
  return count;
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
  const sharedKeywordCount = countSharedKeywords(projAttrs, prodAttrs);
  return {
    embeddingScore: emb,
    attributeScore: attr,
    combined: Math.min(100, combined),
    projectImageId,
    productImageId,
    sharedKeywordCount,
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
 * Also computes photo-level matches with auto-selection for lightbox sidebar.
 * Generates one run_id per run; after upsert, deletes only matches for this project where run_id != current.
 */
export async function computeAndUpsertMatchesForProject(
  projectId: string,
  productIds?: string[]
): Promise<{ upserted: number; errors: string[]; photoMatchesUpserted?: number }> {
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

  // Photo-level matches with auto-selection
  let photoMatchesUpserted = 0;
  try {
    const photoResult = await computeAndUpsertPhotoMatches(projectId, candidates, runId);
    photoMatchesUpserted = photoResult.upserted;
    if (photoResult.errors.length > 0) {
      errors.push(...photoResult.errors.map((e) => `photo_matches: ${e}`));
    }
  } catch (e) {
    errors.push(`photo_matches: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { upserted, errors, photoMatchesUpserted };
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

/* ═══════════════════════════════════════════════════════════════════════════
 * Photo-level matches: per-image product match computation + auto-selection
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Per-image candidate: best score for a product against one project image. */
interface PhotoCandidate {
  listingImageId: string;
  productId: string;
  score: number;
  embeddingScore: number;
  attributeScore: number;
  sharedKeywordCount: number;
}

/**
 * Extract per-photo candidates from project-level MatchCandidates.
 * Groups PairScores by projectImageId, takes best score per product per image.
 */
function extractPhotoCandidates(candidates: MatchCandidate[]): PhotoCandidate[] {
  // Map: projectImageId -> productId -> best PairScore
  const byImage = new Map<string, Map<string, PairScore>>();

  for (const c of candidates) {
    for (const pair of c.scores) {
      let imgMap = byImage.get(pair.projectImageId);
      if (!imgMap) {
        imgMap = new Map();
        byImage.set(pair.projectImageId, imgMap);
      }
      const existing = imgMap.get(c.productId);
      if (!existing || pair.combined > existing.combined) {
        imgMap.set(c.productId, pair);
      }
    }
  }

  const result: PhotoCandidate[] = [];
  for (const [imageId, productMap] of byImage) {
    for (const [productId, pair] of productMap) {
      result.push({
        listingImageId: imageId,
        productId,
        score: pair.combined,
        embeddingScore: pair.embeddingScore,
        attributeScore: pair.attributeScore,
        sharedKeywordCount: pair.sharedKeywordCount,
      });
    }
  }

  return result;
}

/**
 * Apply auto-selection rules to photo candidates for one image.
 *
 * Rules:
 * 1. Score >= PHOTO_AUTO_SELECT_SCORE (85)
 * 2. At least one confidence rule passes:
 *    - Gap between #1 and #2 score >= PHOTO_AUTO_SELECT_GAP (10)
 *    - sharedKeywordCount >= PHOTO_AUTO_SELECT_KEYWORDS (5)
 *    - brandMatch == true (product brand matches project brand)
 * 3. Max PHOTO_AUTO_SELECT_MAX (6) per photo
 * 4. If ANY manual selection exists for this image, skip autos entirely
 */
function applyAutoSelection(
  candidates: PhotoCandidate[],
  brandMatchSet: Set<string>
): PhotoCandidate[] {
  if (candidates.length === 0) return [];

  // Sort by score descending
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  // Gap between top-1 and top-2 scores
  const globalGap =
    sorted.length >= 2 ? sorted[0].score - sorted[1].score : Infinity;

  const selected: PhotoCandidate[] = [];
  for (const c of sorted) {
    if (selected.length >= PHOTO_AUTO_SELECT_MAX) break;
    if (c.score < PHOTO_AUTO_SELECT_SCORE) break;

    // At least one confidence rule must pass
    const passesConfidence =
      globalGap >= PHOTO_AUTO_SELECT_GAP ||
      c.sharedKeywordCount >= PHOTO_AUTO_SELECT_KEYWORDS ||
      brandMatchSet.has(c.productId);

    if (passesConfidence) {
      selected.push(c);
    }
  }

  return selected;
}

/**
 * Fetch brand match data: set of product IDs whose owner brand name
 * matches any brand name in the project's brands_used.
 */
async function getBrandMatchSet(
  projectId: string,
  productIds: string[]
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const sup = getSupabaseServiceClient();

  // Get project brands_used
  const { data: projectRow } = await sup
    .from("listings")
    .select("brands_used")
    .eq("id", projectId)
    .single();
  const brandsUsed = (projectRow?.brands_used ?? []) as { name?: string }[];
  const projectBrandNames = new Set(
    brandsUsed
      .map((b) => (b.name ?? "").trim().toLowerCase())
      .filter(Boolean)
  );
  if (projectBrandNames.size === 0) return new Set();

  // Get product owner profile names
  const { data: products } = await sup
    .from("listings")
    .select("id, owner_profile_id")
    .in("id", productIds)
    .eq("type", "product");

  const profileIds = [
    ...new Set(
      ((products ?? []) as { id: string; owner_profile_id: string | null }[])
        .map((p) => p.owner_profile_id)
        .filter(Boolean) as string[]
    ),
  ];
  if (profileIds.length === 0) return new Set();

  const { data: profiles } = await sup
    .from("profiles")
    .select("id, display_name")
    .in("id", profileIds);

  const profileNameMap = new Map<string, string>();
  for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
    if (p.display_name) profileNameMap.set(p.id, p.display_name.trim().toLowerCase());
  }

  const matchSet = new Set<string>();
  for (const product of ((products ?? []) as { id: string; owner_profile_id: string | null }[])) {
    const ownerName = product.owner_profile_id
      ? profileNameMap.get(product.owner_profile_id)
      : null;
    if (ownerName && projectBrandNames.has(ownerName)) {
      matchSet.add(product.id);
    }
  }

  return matchSet;
}

/**
 * Compute and upsert photo-level matches with auto-selection.
 * Called after project-level match computation with the same candidates and run_id.
 */
async function computeAndUpsertPhotoMatches(
  projectId: string,
  candidates: MatchCandidate[],
  runId: string
): Promise<{ upserted: number; errors: string[] }> {
  const photoCandidates = extractPhotoCandidates(candidates);
  if (photoCandidates.length === 0) return { upserted: 0, errors: [] };

  // Collect unique image IDs and product IDs
  const imageIds = [...new Set(photoCandidates.map((c) => c.listingImageId))];
  const allProductIds = [...new Set(photoCandidates.map((c) => c.productId))];

  // Check for manual selections and get brand match data
  const sup = getSupabaseServiceClient();
  const [brandMatchSet, manualByImage] = await Promise.all([
    getBrandMatchSet(projectId, allProductIds),
    getManualSelectionsByImage(imageIds),
  ]);

  // Build upsert rows with auto-selection
  const rows: PhotoMatchUpsert[] = [];
  const now = new Date().toISOString();

  // Group photo candidates by image
  const byImage = new Map<string, PhotoCandidate[]>();
  for (const pc of photoCandidates) {
    const arr = byImage.get(pc.listingImageId) ?? [];
    arr.push(pc);
    byImage.set(pc.listingImageId, arr);
  }

  for (const [imageId, imageCandidates] of byImage) {
    const hasManual = manualByImage.has(imageId);

    // Auto-select only if no manual selections exist for this image
    const autoSelected = hasManual
      ? []
      : applyAutoSelection(imageCandidates, brandMatchSet);
    const autoSelectedIds = new Set(autoSelected.map((c) => c.productId));

    for (const c of imageCandidates) {
      const isAutoSelected = autoSelectedIds.has(c.productId);
      rows.push({
        listing_image_id: c.listingImageId,
        product_id: c.productId,
        score: c.score,
        embedding_score: c.embeddingScore,
        attribute_score: c.attributeScore,
        shared_keyword_count: c.sharedKeywordCount,
        is_selected: isAutoSelected,
        selected_mode: isAutoSelected ? "auto" : null,
        selected_score: isAutoSelected ? c.score : null,
        selected_at: isAutoSelected ? now : null,
        run_id: runId,
      });
    }
  }

  const result = await upsertPhotoMatchesBatch(rows);

  // Clean up stale photo matches (but preserve manual selections)
  const deleteResult = await deleteStalePhotoMatches(imageIds, runId);
  if (deleteResult.error) {
    result.errors.push(deleteResult.error);
  }

  return result;
}

/**
 * Check which images have manual selections (to skip auto-selection for those).
 */
async function getManualSelectionsByImage(imageIds: string[]): Promise<Set<string>> {
  if (imageIds.length === 0) return new Set();
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("photo_matches")
    .select("listing_image_id")
    .in("listing_image_id", imageIds)
    .eq("is_selected", true)
    .eq("selected_mode", "manual");

  const set = new Set<string>();
  for (const r of (data ?? []) as { listing_image_id: string }[]) {
    set.add(r.listing_image_id);
  }
  return set;
}
