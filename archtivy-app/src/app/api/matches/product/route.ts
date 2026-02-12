import { NextRequest } from "next/server";
import { getProductMatchedProjects } from "@/lib/matches/queries";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import {
  getFirstImageUrlPerListingIds,
  sanitizeListingImageUrl,
} from "@/lib/db/listingImages";

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
  const productId = request.nextUrl.searchParams.get("productId");
  const tier = (request.nextUrl.searchParams.get("tier") as MatchTierFilter) ?? "all";
  const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "8", 10) || 8));

  if (!productId) {
    return Response.json({ error: "productId required" }, { status: 400 });
  }

  const { data: rows } = await getProductMatchedProjects({ productId, tier, limit, offset: 0 });
  if (rows.length === 0) {
    return Response.json({ items: [] });
  }

  const projectIds = Array.from(new Set(rows.map((r) => r.project_id)));
  const sup = getSupabaseServiceClient();
  const { data: listings } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url")
    .eq("type", "project")
    .in("id", projectIds);
  const thumbMapResult = await getFirstImageUrlPerListingIds(projectIds);
  const thumbMap = thumbMapResult.data ?? {};

  const listingList = (listings ?? []) as {
    id: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
  }[];

  const items: MatchItem[] = [];
  for (const row of rows) {
    const L = listingList.find((x) => x.id === row.project_id);
    if (!L) continue;
    const rawImage =
      (L.cover_image_url?.trim() && L.cover_image_url) || thumbMap[L.id] || null;
    const primary_image = sanitizeListingImageUrl(rawImage) ?? null;
    items.push({
      id: L.id,
      title: L.title ?? "",
      slug: L.slug ?? L.id,
      primary_image,
      score: row.score,
      tier: row.tier,
    });
  }

  return Response.json({ items });
}
