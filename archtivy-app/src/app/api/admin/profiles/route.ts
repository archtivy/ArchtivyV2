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
  const role = searchParams.get("role")?.trim() ?? "";
  const verified = searchParams.get("verified")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("profiles")
    .select(
      "id,display_name,username,role,location_city,avatar_url,claim_status,is_admin,created_at,updated_at,bio",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  if (role) query = query.eq("role", role);
  if (verified === "1") query = query.eq("is_admin", true);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profileIds = (data ?? []).map((p: { id: string }) => p.id);

  // Fetch listing counts per profile
  const { data: listingCounts } = profileIds.length
    ? await supabase
        .from("listings")
        .select("owner_profile_id")
        .in("owner_profile_id", profileIds)
        .is("deleted_at", null)
    : { data: [] };

  const listingCountMap: Record<string, number> = {};
  for (const r of (listingCounts ?? []) as Array<{ owner_profile_id: string }>) {
    listingCountMap[r.owner_profile_id] = (listingCountMap[r.owner_profile_id] ?? 0) + 1;
  }

  // Fetch connection counts per profile via project_product_links
  const { data: connData } = profileIds.length
    ? await supabase
        .from("project_product_links")
        .select("project_id, product_id")
    : { data: [] };

  const rows = (data ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    listings_count: listingCountMap[p.id as string] ?? 0,
    connections_count: 0, // Simplified: use dedicated endpoint for per-profile connections
  }));

  return NextResponse.json({ data: rows, total: count ?? 0, page, pageSize });
}
