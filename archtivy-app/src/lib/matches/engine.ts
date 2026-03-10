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

  // Photo-level matches: keyword-based per-image matching
  let photoMatchesUpserted = 0;
  try {
    const photoResult = await computeKeywordPhotoMatches(projectId);
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
 * Photo-level matches: keyword-based per-image product matching
 *
 * For each project image, combines alt + title + caption text, tokenizes,
 * then scores every active product by keyword overlap. Deterministic,
 * no embedding dependency.
 * ═══════════════════════════════════════════════════════════════════════════ */

const KEYWORD_STOPWORDS = new Set([
  "with", "and", "the", "or", "modern", "beautiful", "elegant", "interior",
  "architecture", "design", "for", "from", "that", "this", "into",
  "our", "your", "its", "has", "have", "been", "will", "can",
  "are", "was", "were", "but", "not", "all", "any", "each",
  "new", "old", "also", "very", "just", "more", "most", "some",
  "than", "then", "when", "where", "which", "while", "about",
  "between", "through", "during", "before", "after", "above", "below",
  "out", "off", "over", "under", "again", "once", "here", "there",
  "how", "both", "few", "other", "such", "only", "same", "too",
  "product", "image", "photo", "picture", "view",
]);

const PHOTO_MATCH_MIN_SCORE = 70;
const PHOTO_MATCH_MAX_PER_IMAGE = 3;

/** Normalize text → lowercase token set, removing punctuation and stopwords. */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !KEYWORD_STOPWORDS.has(t));
  return new Set(tokens);
}

/** Score fields for keyword matching. */
interface ProductKeywordData {
  id: string;
  titleTokens: Set<string>;
  categoryTokens: Set<string>;
  materialTokens: Set<string>;
  colorTokens: Set<string>;
  allTokens: Set<string>;
}

function buildProductKeywordData(product: {
  id: string;
  title: string | null;
  product_category: string | null;
  product_subcategory: string | null;
  material_or_finish: string | null;
  feature_highlight: string | null;
  color: string | null;
}): ProductKeywordData {
  const titleTokens = tokenize(product.title ?? "");
  const categoryTokens = tokenize(
    [product.product_category, product.product_subcategory].filter(Boolean).join(" ")
  );
  const materialTokens = tokenize(
    [product.material_or_finish, product.feature_highlight].filter(Boolean).join(" ")
  );
  const colorTokens = tokenize(product.color ?? "");
  const allTokens = new Set([...titleTokens, ...categoryTokens, ...materialTokens, ...colorTokens]);
  return { id: product.id, titleTokens, categoryTokens, materialTokens, colorTokens, allTokens };
}

/** Score one image's keyword set against one product. */
function scoreImageProduct(imageTokens: Set<string>, product: ProductKeywordData): number {
  let score = 0;

  // +35 for title keyword overlap
  for (const t of product.titleTokens) {
    if (imageTokens.has(t)) { score += 35; break; }
  }
  // +25 for category/subcategory overlap
  for (const t of product.categoryTokens) {
    if (imageTokens.has(t)) { score += 25; break; }
  }
  // +25 for material/finish overlap
  for (const t of product.materialTokens) {
    if (imageTokens.has(t)) { score += 25; break; }
  }
  // +10 for color overlap
  for (const t of product.colorTokens) {
    if (imageTokens.has(t)) { score += 10; break; }
  }
  // +5 per additional keyword overlap (cap at +20)
  let extraCount = 0;
  for (const t of product.allTokens) {
    if (imageTokens.has(t)) extraCount++;
  }
  // Subtract the keywords already counted above (max 4 primary matches)
  const primaryHits = (score > 0 ? Math.min(4, Math.floor(score / 10)) : 0);
  const extraHits = Math.max(0, extraCount - primaryHits);
  score += Math.min(20, extraHits * 5);

  return score;
}

/**
 * Keyword-based photo match engine.
 * Reads image text (alt/title/caption) from listing_images,
 * reads all active products from listings, scores each pair,
 * and upserts results into photo_matches.
 *
 * Rules:
 * - score >= 70 → written to photo_matches, is_selected=true
 * - score >= 85 → selected_mode='auto'
 * - score 70–84 → selected_mode='keyword'
 * - If no product scores >= 70 for an image, take the top-1 as fallback
 * - Max 3 products per image
 * - Manual selections are never overwritten
 */
export async function computeKeywordPhotoMatches(
  projectId: string
): Promise<{ upserted: number; errors: string[] }> {
  const sup = getSupabaseServiceClient();
  const runId = crypto.randomUUID();

  // 1. Fetch project images with text fields
  const { data: imageRows, error: imgErr } = await sup
    .from("listing_images")
    .select("id, alt, title, caption")
    .eq("listing_id", projectId)
    .order("sort_order", { ascending: true });

  if (imgErr) return { upserted: 0, errors: [imgErr.message] };
  if (!imageRows || imageRows.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[keywordPhotoMatches] project=${projectId} — 0 images`);
    }
    return { upserted: 0, errors: [] };
  }

  const images = imageRows as { id: string; alt: string | null; title: string | null; caption: string | null }[];

  // 2. Fetch all active products
  const { data: productRows, error: prodErr } = await sup
    .from("listings")
    .select("id, title, product_category, product_subcategory, material_or_finish, feature_highlight")
    .eq("type", "product")
    .is("deleted_at", null);

  if (prodErr) return { upserted: 0, errors: [prodErr.message] };
  if (!productRows || productRows.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[keywordPhotoMatches] project=${projectId} — 0 active products in DB`);
    }
    return { upserted: 0, errors: [] };
  }

  const products = (productRows as {
    id: string; title: string | null;
    product_category: string | null; product_subcategory: string | null;
    material_or_finish: string | null; feature_highlight: string | null;
  }[]).map((p) => buildProductKeywordData({ ...p, color: null }));

  // 3. Check for manual selections
  const imageIds = images.map((img) => img.id);
  const manualByImage = await getManualSelectionsByImage(imageIds);

  // 4. Score each image × product
  const now = new Date().toISOString();
  const rows: PhotoMatchUpsert[] = [];
  let fallbackUsed = 0;

  for (const img of images) {
    const text = [img.alt, img.title, img.caption].filter(Boolean).join(" ");
    const imageTokens = tokenize(text);
    if (imageTokens.size === 0) continue;

    const hasManual = manualByImage.has(img.id);

    // Score all products
    const scored: { productId: string; score: number }[] = [];
    for (const p of products) {
      const s = scoreImageProduct(imageTokens, p);
      if (s > 0) scored.push({ productId: p.id, score: s });
    }
    scored.sort((a, b) => b.score - a.score);

    // Select matches: >= 70, max 3; fallback to top-1 if none qualify
    let selected = scored.filter((s) => s.score >= PHOTO_MATCH_MIN_SCORE);
    if (selected.length === 0 && scored.length > 0) {
      selected = [scored[0]];
      fallbackUsed++;
    }
    selected = selected.slice(0, PHOTO_MATCH_MAX_PER_IMAGE);

    for (const m of selected) {
      const isAuto = !hasManual && m.score >= PHOTO_AUTO_SELECT_SCORE;
      const mode = hasManual ? null : (isAuto ? "auto" : "keyword");
      rows.push({
        photo_id: img.id,
        product_id: m.productId,
        score: m.score,
        embedding_score: 0,
        attribute_score: 0,
        shared_keyword_count: 0,
        is_selected: !hasManual,
        selected_mode: mode,
        selected_score: m.score,
        selected_at: now,
        run_id: runId,
      });
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[keywordPhotoMatches] project=${projectId}`,
      `photos_processed=${images.length}`,
      `products_considered=${products.length}`,
      `matches_written=${rows.length}`,
      `fallback_used=${fallbackUsed}`
    );
  }

  if (rows.length === 0) {
    return { upserted: 0, errors: [] };
  }

  // 5. Upsert
  const result = await upsertPhotoMatchesBatch(rows);

  // 6. Clean stale rows (preserve manual)
  const deleteResult = await deleteStalePhotoMatches(imageIds, runId);
  if (deleteResult.error) result.errors.push(deleteResult.error);

  return result;
}

/**
 * Recompute keyword photo matches for ALL active projects.
 * Use when product data changes (create/update/delete) so every project
 * picks up the new product catalog. Non-blocking, non-fatal.
 */
export async function recomputeAllKeywordPhotoMatches(): Promise<{
  projectsProcessed: number;
  errors: string[];
}> {
  const sup = getSupabaseServiceClient();
  const { data: projects, error } = await sup
    .from("listings")
    .select("id")
    .eq("type", "project")
    .is("deleted_at", null);

  if (error || !projects) return { projectsProcessed: 0, errors: [error?.message ?? "fetch failed"] };

  const errors: string[] = [];
  let processed = 0;
  for (const p of projects) {
    try {
      const result = await computeKeywordPhotoMatches(p.id);
      if (result.errors.length > 0) errors.push(...result.errors);
      processed++;
    } catch (e) {
      errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`[recomputeAllKeywordPhotoMatches] processed=${processed}/${projects.length} errors=${errors.length}`);
  return { projectsProcessed: processed, errors };
}

/**
 * Check which images have manual selections (to skip auto-selection for those).
 */
async function getManualSelectionsByImage(imageIds: string[]): Promise<Set<string>> {
  if (imageIds.length === 0) return new Set();
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("photo_matches")
    .select("photo_id")
    .in("photo_id", imageIds)
    .eq("is_selected", true)
    .eq("selected_mode", "manual");

  const set = new Set<string>();
  for (const r of (data ?? []) as { photo_id: string }[]) {
    set.add(r.photo_id);
  }
  return set;
}
