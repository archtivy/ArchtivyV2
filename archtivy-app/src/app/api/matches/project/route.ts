import { NextRequest } from "next/server";
import { getProjectMatches } from "@/lib/matches/queries";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getFirstImageUrlPerListingIds, sanitizeListingImageUrl } from "@/lib/db/listingImages";

export type MatchTierFilter = "verified" | "possible" | "all";

export interface MatchItem {
  id: string;
  title: string;
  slug: string;
  primary_image: string | null;
  score: number;
  tier: "verified" | "possible";
  author?: string;
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const tier = (request.nextUrl.searchParams.get("tier") as MatchTierFilter) ?? "all";
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "8", 10) || 8));

  if (!projectId) {
    return Response.json({ error: "projectId required" }, { status: 400 });
  }

  const { data: rows } = await getProjectMatches({ projectId, tier, limit, offset: 0 });
  if (rows.length === 0) {
    return Response.json({ items: [] });
  }

  const productIds = Array.from(new Set(rows.map((r) => r.product_id)));
  const sup = getSupabaseServiceClient();
  const { data: products } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url, owner_profile_id")
    .eq("type", "product")
    .in("id", productIds);
  const thumbMapResult = await getFirstImageUrlPerListingIds(productIds);
  const thumbMap = thumbMapResult.data ?? {};

  const productList = (products ?? []) as {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
    owner_profile_id: string | null;
  }[];

  const items: MatchItem[] = [];
  for (const row of rows) {
    const p = productList.find((x) => x.id === row.product_id);
    if (!p) continue;
    const rawImage =
      (p.cover_image_url?.trim() && p.cover_image_url) || thumbMap[p.id] || null;
    const primary_image = sanitizeListingImageUrl(rawImage) ?? null;
    items.push({
      id: p.id,
      title: p.title ?? "",
      slug: p.slug ?? p.id,
      primary_image,
      score: row.score,
      tier: row.tier,
    });
  }

  return Response.json({ items });
}
