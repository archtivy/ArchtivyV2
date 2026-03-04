/**
 * Deterministic product scoring against parsed alt-text features.
 * Returns a normalized 0..1 score and human-readable match reasons.
 */

import type { AltTextFeatures } from "@/lib/altTextParser";

// ── Weights ─────────────────────────────────────────────────────────────────

const W_TITLE_TOKEN   = 3;   // per overlapping token in product title
const W_MATERIAL      = 4;   // per matching material
const W_COLOR         = 3;   // per matching color
const W_OBJECT_TYPE   = 3;   // if product type/category matches an object token
const W_BRAND         = 5;   // if product's brand matches a detected brand
const W_FEATURE_TOKEN = 2;   // per overlapping token in feature_highlight

/**
 * Stable cap for normalization. Chosen so a strong match (~5 signals)
 * yields ~0.8-0.9 instead of 1.0. Higher raw scores clamp to 1.0.
 */
const MAX_RAW_SCORE = 30;

/** Minimum meaningful token length for overlap checks. */
const MIN_TOKEN_LEN = 2;

// ── Types ───────────────────────────────────────────────────────────────────

export interface CandidateProduct {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  feature_highlight: string | null;
  product_type: string | null;
  product_category: string | null;
  /** Owner profile ID — used to resolve brand name externally. */
  owner_profile_id: string | null;
  /** Resolved brand display name (may be null if not resolved). */
  brandName: string | null;
  /** Material names (lowercased) resolved from product_material_links. */
  materials: string[];
  /** Color option strings (lowercased) from products.color_options. */
  colors: string[];
}

export interface ScoredProduct {
  id: string;
  title: string | null;
  slug: string | null;
  coverImageUrl: string | null;
  brandName: string | null;
  /** Normalized score 0..1. */
  score: number;
  /** Human-readable reasons for the score, e.g. ["material: marble", "color: white"]. */
  matchReasons: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Tokenize a string for overlap comparison: lowercase, split, filter short tokens. */
function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= MIN_TOKEN_LEN)
  );
}

/** Count set intersection size. */
function intersect(a: Set<string> | string[], b: Set<string> | string[]): string[] {
  const setB = b instanceof Set ? b : new Set(b);
  const arr = a instanceof Set ? [...a] : a;
  return arr.filter((v) => setB.has(v));
}

// ── Scoring ─────────────────────────────────────────────────────────────────

/**
 * Score a single candidate product against parsed alt-text features.
 *
 * Signals:
 *  - Title token overlap:        +3 per match
 *  - Material match:             +4 per match
 *  - Color match:                +3 per match
 *  - Object/type/category match: +3 (once)
 *  - Brand match:                +5 (once)
 *  - Feature highlight overlap:  +2 per match
 *
 * Score is raw / MAX_RAW_SCORE, clamped to [0, 1].
 */
export function scoreProduct(
  candidate: CandidateProduct,
  features: AltTextFeatures
): ScoredProduct {
  let raw = 0;
  const reasons: string[] = [];

  // All alt tokens for overlap (materials + colors + objects + remaining)
  const altTokens = new Set([
    ...features.materials,
    ...features.colors,
    ...features.objects,
    ...features.tokens,
  ]);

  // 1. Title token overlap
  const titleTokens = tokenize(candidate.title);
  const titleOverlap = intersect(altTokens, titleTokens);
  if (titleOverlap.length > 0) {
    raw += titleOverlap.length * W_TITLE_TOKEN;
    reasons.push(`title: ${titleOverlap.join(", ")}`);
  }

  // 2. Material match
  const candidateMaterials = candidate.materials.map((m) => m.toLowerCase());
  const materialOverlap = intersect(features.materials, candidateMaterials);
  if (materialOverlap.length > 0) {
    raw += materialOverlap.length * W_MATERIAL;
    reasons.push(`material: ${materialOverlap.join(", ")}`);
  }

  // 3. Color match
  const candidateColors = candidate.colors.map((c) => c.toLowerCase());
  const colorOverlap = intersect(features.colors, candidateColors);
  if (colorOverlap.length > 0) {
    raw += colorOverlap.length * W_COLOR;
    reasons.push(`color: ${colorOverlap.join(", ")}`);
  }

  // 4. Object/type/category match
  const typeTokens = tokenize(
    [candidate.product_type, candidate.product_category].filter(Boolean).join(" ")
  );
  const objectOverlap = intersect(features.objects, typeTokens);
  if (objectOverlap.length > 0) {
    raw += W_OBJECT_TYPE; // once, regardless of how many match
    reasons.push(`type: ${objectOverlap.join(", ")}`);
  }

  // 5. Brand match
  if (candidate.brandName && features.brands.length > 0) {
    const brandLower = candidate.brandName.toLowerCase();
    const brandMatch = features.brands.find((b) => b.toLowerCase() === brandLower);
    if (brandMatch) {
      raw += W_BRAND;
      reasons.push(`brand: ${brandMatch}`);
    }
  }

  // 6. Feature highlight overlap
  const featureTokens = tokenize(candidate.feature_highlight);
  const featureOverlap = intersect(altTokens, featureTokens);
  if (featureOverlap.length > 0) {
    raw += featureOverlap.length * W_FEATURE_TOKEN;
    reasons.push(`feature: ${featureOverlap.join(", ")}`);
  }

  const score = Math.min(raw / MAX_RAW_SCORE, 1);

  return {
    id: candidate.id,
    title: candidate.title,
    slug: candidate.slug,
    coverImageUrl: candidate.cover_image_url,
    brandName: candidate.brandName,
    score: Math.round(score * 1000) / 1000, // 3 decimal places
    matchReasons: reasons,
  };
}

/**
 * Score, filter, and rank an array of candidates.
 * Returns products sorted by score DESC, then title ASC.
 */
export function scoreAndRank(
  candidates: CandidateProduct[],
  features: AltTextFeatures,
  minScore: number = 0.1
): ScoredProduct[] {
  return candidates
    .map((c) => scoreProduct(c, features))
    .filter((p) => p.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.title ?? "").localeCompare(b.title ?? "");
    });
}
