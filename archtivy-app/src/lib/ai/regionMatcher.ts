/**
 * Region → Product matcher.
 * For each AI-detected region, finds similar products from Archtivy's catalog.
 *
 * Uses a multi-signal scoring approach:
 *   1. Taxonomy/category match (object_type ↔ product taxonomy)
 *   2. Keyword overlap (region keywords ↔ product title + description)
 *   3. Material match (region keywords ↔ product materials)
 *
 * V1 is text-based. V2 can add embedding similarity from image_ai table.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { DetectedRegion } from "./regions";
import type { MatchCandidate } from "@/lib/db/imageRegions";
import { HIGH_MATCH_THRESHOLD } from "@/lib/db/imageRegions";

/** Map from region object_type to taxonomy search terms. */
const TYPE_TO_TAXONOMY: Record<string, string[]> = {
  seating:  ["seating", "sofa", "chair", "armchair", "stool", "bench"],
  table:    ["table", "desk", "dining", "coffee table", "side table"],
  lighting: ["lighting", "lamp", "pendant", "sconce", "chandelier"],
  bed:      ["bed", "bedroom", "mattress"],
  sink:     ["sink", "basin", "washbasin", "bathroom"],
  faucet:   ["faucet", "tap", "mixer", "bathroom"],
  rug:      ["rug", "carpet", "floor covering"],
  shelving: ["shelving", "shelf", "bookshelf", "storage", "cabinet"],
};

const MAX_CANDIDATES = 6;

/**
 * Find matching products for a single detected region.
 */
export async function matchRegionToProducts(
  region: DetectedRegion
): Promise<{ bestMatch: MatchCandidate | null; candidates: MatchCandidate[] }> {
  const sup = getSupabaseServiceClient();

  // Build search terms from region
  const taxonomyTerms = TYPE_TO_TAXONOMY[region.object_type] ?? [region.object_type];
  const allKeywords = [...region.keywords, region.label, ...taxonomyTerms];
  const searchQuery = allKeywords.slice(0, 8).join(" ");

  // Search products using full-text search on title + description
  // Fall back to ILIKE if textSearch isn't available
  const { data: products, error } = await sup
    .from("listings")
    .select("id, title, slug, cover_image_url, description, category, product_type, owner_profile_id, profiles!listings_owner_profile_id_fkey(display_name)")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .or(taxonomyTerms.map((t) => `title.ilike.%${t}%`).join(","))
    .limit(30);

  if (error || !products?.length) {
    // Fallback: broader search
    const { data: fallback } = await sup
      .from("listings")
      .select("id, title, slug, cover_image_url, description, category, product_type, owner_profile_id, profiles!listings_owner_profile_id_fkey(display_name)")
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .ilike("title", `%${region.label.split(" ")[0]}%`)
      .limit(20);

    if (!fallback?.length) return { bestMatch: null, candidates: [] };
    return scoreAndRank(region, fallback);
  }

  return scoreAndRank(region, products);
}

function scoreAndRank(
  region: DetectedRegion,
  products: Record<string, unknown>[]
): { bestMatch: MatchCandidate | null; candidates: MatchCandidate[] } {
  const regionKeywordsLower = new Set(
    [...region.keywords, region.label].map((k) => k.toLowerCase())
  );

  const scored = products.map((p) => {
    const title = ((p.title as string) ?? "").toLowerCase();
    const desc = ((p.description as string) ?? "").toLowerCase();
    const category = ((p.category as string) ?? "").toLowerCase();
    const productType = ((p.product_type as string) ?? "").toLowerCase();
    const combined = `${title} ${desc} ${category} ${productType}`;

    // Score signals
    let score = 0;

    // 1. Category/type alignment (0–0.3)
    const taxonomyTerms = TYPE_TO_TAXONOMY[region.object_type] ?? [];
    const categoryMatch = taxonomyTerms.some((t) => combined.includes(t));
    if (categoryMatch) score += 0.3;

    // 2. Keyword overlap (0–0.4)
    let keywordHits = 0;
    for (const kw of regionKeywordsLower) {
      if (combined.includes(kw)) keywordHits++;
    }
    const keywordScore = Math.min(keywordHits / Math.max(regionKeywordsLower.size, 1), 1) * 0.4;
    score += keywordScore;

    // 3. Title direct match (0–0.2)
    const labelWords = region.label.toLowerCase().split(/\s+/);
    const titleHits = labelWords.filter((w) => title.includes(w)).length;
    score += (titleHits / Math.max(labelWords.length, 1)) * 0.2;

    // 4. Confidence boost (0–0.1)
    score += region.confidence * 0.1;

    const brand = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as { display_name: string | null } | null;

    return {
      listing_id: p.id as string,
      score: Math.min(score, 1),
      title: (p.title as string) ?? "Product",
      slug: (p.slug as string) ?? null,
      cover: (p.cover_image_url as string) ?? null,
      brand: brand?.display_name ?? null,
      taxonomy_slug_path: null, // Enriched later if needed
    };
  });

  // Sort by score descending, take top candidates
  scored.sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, MAX_CANDIDATES);

  // Best match only if score is high enough
  const bestMatch = candidates[0]?.score >= HIGH_MATCH_THRESHOLD ? candidates[0] : null;

  return { bestMatch, candidates };
}
