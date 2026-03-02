export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    profilesTotal,
    profilesToday,
    profiles7d,
    profiles30d,
    projectsTotal,
    projects7d,
    productsTotal,
    products7d,
    missingImages,
    missingLocation,
    missingTeam,
    lowWordCount,
    noMatches,
    totalSaves,
    totalConnections,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).is("deleted_at" as never, null),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "project").is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "project").gte("created_at", sevenDaysAgo),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "product").is("deleted_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("type", "product").gte("created_at", sevenDaysAgo),
    // Listings with fewer than 3 images (fetch ids from listing_images and count)
    supabase.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null).is("cover_image_url", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null).is("location", null).eq("type", "project"),
    supabase.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("type", "project"),
    // Low word count: description shorter than 50 words approximated by < 300 chars
    supabase.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null).or("description.is.null,description.lt.50"),
    supabase.from("listings").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("user_saves").select("id", { count: "exact", head: true }),
    supabase.from("project_product_links").select("project_id", { count: "exact", head: true }),
  ]);

  // Listings with team members: approximate via team_members json not empty
  const { count: withTeam } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("type", "project")
    .is("deleted_at", null)
    .not("team_members", "eq", "[]");

  const noTeamCount = Math.max(0, (projectsTotal.count ?? 0) - (withTeam ?? 0));

  // Listings with no related matches (project_product_links count = 0)
  const { data: linkedProjectIds } = await supabase
    .from("project_product_links")
    .select("project_id");
  const linkedSet = new Set((linkedProjectIds ?? []).map((r: { project_id: string }) => r.project_id));
  const noMatchesCount = Math.max(0, (projectsTotal.count ?? 0) - linkedSet.size);

  return NextResponse.json({
    profiles: {
      total: profilesTotal.count ?? 0,
      today: profilesToday.count ?? 0,
      last7d: profiles7d.count ?? 0,
      last30d: profiles30d.count ?? 0,
    },
    projects: {
      total: projectsTotal.count ?? 0,
      last7d: projects7d.count ?? 0,
    },
    products: {
      total: productsTotal.count ?? 0,
      last7d: products7d.count ?? 0,
    },
    metrics: {
      total_saves: totalSaves.count ?? 0,
      total_connections: totalConnections.count ?? 0,
    },
    alerts: {
      missing_cover_image: missingImages.count ?? 0,
      missing_location: missingLocation.count ?? 0,
      missing_team: noTeamCount,
      low_word_count: lowWordCount.count ?? 0,
      no_matches: noMatchesCount,
    },
  });
}
