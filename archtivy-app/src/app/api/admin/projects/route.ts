export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const year = searchParams.get("year")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const featured = searchParams.get("featured")?.trim() ?? "";
  const hasProducts = searchParams.get("hasProducts")?.trim() ?? "";
  const hasTeam = searchParams.get("hasTeam")?.trim() ?? "";
  const missing = searchParams.get("missing")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("listings")
    .select(
      "id,title,description,location,location_city,year,created_at,updated_at,cover_image_url,category,team_members",
      { count: "exact" }
    )
    .eq("type", "project")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q) query = query.ilike("title", `%${q}%`);
  if (year) query = query.eq("year", year);
  if (city) query = query.ilike("location_city", `%${city}%`);
  if (category) query = query.eq("category", category);
  if (missing === "1") query = query.or("description.is.null,location.is.null,cover_image_url.is.null");
  if (hasTeam === "1") query = query.not("team_members", "eq", "[]").not("team_members", "is", null);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((r: { id: string }) => r.id);

  const [imagesRes, linksRes] = await Promise.all([
    ids.length ? supabase.from("listing_images").select("listing_id").in("listing_id", ids) : { data: [] },
    ids.length ? supabase.from("project_product_links").select("project_id").in("project_id", ids) : { data: [] },
  ]);

  const imageCount: Record<string, number> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string }>) {
    imageCount[r.listing_id] = (imageCount[r.listing_id] ?? 0) + 1;
  }
  const linkCount: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ project_id: string }>) {
    linkCount[r.project_id] = (linkCount[r.project_id] ?? 0) + 1;
  }

  const rows = (data ?? [])
    .map((r: Record<string, unknown>) => ({
      ...r,
      image_count: imageCount[r.id as string] ?? 0,
      product_count: linkCount[r.id as string] ?? 0,
      word_count: r.description
        ? String(r.description).split(/\s+/).filter(Boolean).length
        : 0,
      has_team: Array.isArray(r.team_members) && r.team_members.length > 0,
    }))
    .filter((r) => (hasProducts === "1" ? r.product_count > 0 : true))
    .filter((r) => (hasProducts === "0" ? r.product_count === 0 : true));

  return NextResponse.json({ data: rows, total: count ?? 0, page, pageSize });
}
