/*
 * ── createTag / updateTag / deleteTag ARE GONE ──────────────────────────────
 *
 * All three wrote to photo_product_tags, which is retired. Two of them could
 * not have worked for months: createTag inserted product_id NULL into a NOT
 * NULL column, and updateTag wrote feature_text / material_id / color_text /
 * the three taxonomy id columns, none of which exist on that table. The last
 * successful write to it was 2026-03-11.
 *
 * Pin mutations now live in app/actions/productTags.ts — createPin, deletePin,
 * movePin, reviewPin — against product_tags, which has the verification
 * workflow, an audit log, and maintains the project_product_links edge.
 */
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import {
  searchSuggestedProducts as dbSearchSuggestedProducts,
  getTagCategoryOptions as dbGetTagCategoryOptions,
  getTagSubcategoryOptions as dbGetTagSubcategoryOptions,
  getSuggestedProductsForWorkstation as dbGetSuggestedProductsForWorkstation,
  getAltTextCandidates,
  type TagSuggestionProduct,
  type SearchSuggestedProductsFilters,
  type WorkstationSuggestedProduct,
  type WorkstationSuggestedFilters,
  type AltTextCandidateFilters,
} from "@/lib/db/productSuggestions";
import { parseAltText } from "@/lib/altTextParser";
import { scoreAndRank, type ScoredProduct } from "@/lib/scoring/productAltScore";

export type { TagSuggestionProduct };
import { getListingSlugById } from "@/lib/db/listings";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { ActionResultSuccess } from "./types";




/** Admin-only: search products for tag suggestions. */
export async function searchSuggestedProducts(
  filters: SearchSuggestedProductsFilters
): Promise<ActionResultSuccess<TagSuggestionProduct[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbSearchSuggestedProducts(filters, 25);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

/** Admin-only: get category options for tag editor. */
export async function getTagCategoryOptions(): Promise<ActionResultSuccess<string[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetTagCategoryOptions();
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

/** Admin-only: get subcategory options for tag editor. */
export async function getTagSubcategoryOptions(): Promise<ActionResultSuccess<string[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetTagSubcategoryOptions();
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? [] };
}

export type { WorkstationSuggestedProduct, WorkstationSuggestedFilters };

/** Admin-only: suggested products for tagging workstation with Best Match scoring. */
export async function getSuggestedProductsForWorkstation(
  filters: WorkstationSuggestedFilters
): Promise<
  ActionResultSuccess<{ bestMatch: WorkstationSuggestedProduct[]; allResults: WorkstationSuggestedProduct[] }>
> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }
  const res = await dbGetSuggestedProductsForWorkstation(filters, 50);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, data: res.data ?? { bestMatch: [], allResults: [] } };
}

// ─── Alt-Text–based suggestions ─────────────────────────────────────────────

export type { ScoredProduct };

/**
 * Admin-only: Get product suggestions based on an image's alt text.
 * Parses alt text → extracts features → retrieves candidates → scores → ranks.
 *
 * @param input.listingImageId  The listing_images.id to read alt text from.
 * @returns  { suggested: top 12 scored products, allResults: top 48 }
 */
export async function getAltTextSuggestions(input: {
  listingImageId: string;
}): Promise<
  ActionResultSuccess<{ suggested: ScoredProduct[]; allResults: ScoredProduct[]; altText: string | null }>
> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const supabase = getSupabaseServiceClient();

  // Fetch alt text from listing_images (support both "alt" and "alt_text" column names)
  const { data: imgRow, error: imgErr } = await supabase
    .from("listing_images")
    .select("*")
    .eq("id", input.listingImageId)
    .single();

  if (imgErr || !imgRow) {
    return { ok: false, error: "Image not found" };
  }

  // Support both column names: "alt" (confirmed) or "alt_text" (fallback)
  const row = imgRow as Record<string, unknown>;
  const altText = (typeof row.alt === "string" ? row.alt : null)
    ?? (typeof row.alt_text === "string" ? row.alt_text : null);

  if (!altText || !altText.trim()) {
    return {
      ok: true,
      data: { suggested: [], allResults: [], altText: null },
    };
  }

  // Fetch brand names for alt-text brand detection (limit 500, role=brand)
  const { data: brandProfiles } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("role", "brand")
    .not("display_name", "is", null)
    .limit(500);

  const brandNames = (brandProfiles ?? [])
    .map((p: { display_name: string | null }) => p.display_name)
    .filter((n): n is string => !!n && n.trim().length >= 2);

  // Parse alt text
  const features = parseAltText(altText, brandNames);

  if (features.isEmpty) {
    return {
      ok: true,
      data: { suggested: [], allResults: [], altText },
    };
  }

  // Retrieve candidates
  const candidatesResult = await getAltTextCandidates({
    ftsQuery: features.ftsQuery,
    altTextRaw: altText,
    materials: features.materials,
  });

  if (candidatesResult.error) {
    return { ok: false, error: candidatesResult.error };
  }

  const candidates = candidatesResult.data ?? [];

  if (candidates.length === 0) {
    return {
      ok: true,
      data: { suggested: [], allResults: [], altText },
    };
  }

  // Score and rank
  const scored = scoreAndRank(candidates, features, 0.10);

  return {
    ok: true,
    data: {
      suggested: scored.slice(0, 12),
      allResults: scored.slice(0, 48),
      altText,
    },
  };
}

/**
 * Admin-only: Search products by free text query.
 * Lightweight ILIKE search with title-token overlap scoring.
 * Used as a manual fallback when alt text is empty or suggestions miss.
 */
export async function searchProductsByText(input: {
  query: string;
  limit?: number;
}): Promise<ActionResultSuccess<ScoredProduct[]>> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const q = input.query.trim();
  if (!q || q.length < 2) {
    return { ok: true, data: [] };
  }

  const supabase = getSupabaseServiceClient();
  const limit = Math.min(input.limit ?? 24, 50);
  const escaped = q.replace(/%/g, "\\%").replace(/_/g, "\\_");

  const { data, error } = await supabase
    .from("listings")
    .select("id, title, slug, cover_image_url, owner_profile_id")
    .eq("type", "product")
    .is("deleted_at", null)
    .or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%,feature_highlight.ilike.%${escaped}%`)
    .limit(limit);

  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as {
    id: string;
    title: string | null;
    slug: string | null;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }[];

  // Resolve brand names
  const profileIds = [...new Set(rows.map((r) => r.owner_profile_id).filter(Boolean))] as string[];
  let brandByProfileId: Record<string, string> = {};
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      const pr = p as { id: string; display_name: string | null; username: string | null };
      brandByProfileId[pr.id] = (pr.display_name ?? pr.username ?? "").trim();
    }
  }

  // Light scoring by title token overlap
  const queryTokens = new Set(
    q.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2)
  );

  const scored: ScoredProduct[] = rows.map((r) => {
    const titleTokens = new Set(
      (r.title ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length >= 2)
    );
    const overlap = [...queryTokens].filter((t) => titleTokens.has(t));
    const raw = overlap.length * 3;
    const score = Math.min(raw / 15, 1); // light cap
    const brandName = r.owner_profile_id ? (brandByProfileId[r.owner_profile_id] ?? null) : null;

    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      coverImageUrl: r.cover_image_url,
      brandName,
      score: Math.round(score * 1000) / 1000,
      matchReasons: overlap.length > 0 ? [`search: ${overlap.join(", ")}`] : [],
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });

  return { ok: true, data: scored };
}
