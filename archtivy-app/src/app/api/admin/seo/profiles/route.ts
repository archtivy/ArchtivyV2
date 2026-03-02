export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type SeoStatus = "PASS" | "WARN" | "FAIL";

const BIO_THRESHOLD = 80; // chars

function pickStatus(score: number): SeoStatus {
  if (score >= 80) return "PASS";
  if (score >= 50) return "WARN";
  return "FAIL";
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();
  const { searchParams } = req.nextUrl;
  const filter = searchParams.get("filter") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: profiles, count, error } = await supabase
    .from("profiles")
    .select("id,display_name,username,bio,avatar_url,role,location_city,website,is_hidden", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profileIds = (profiles ?? []).map((p: { id: string }) => p.id);

  const { data: listingData } = profileIds.length
    ? await supabase
        .from("listings")
        .select("owner_profile_id")
        .in("owner_profile_id", profileIds)
        .is("deleted_at", null)
    : { data: [] };

  const listingCount: Record<string, number> = {};
  for (const r of (listingData ?? []) as Array<{ owner_profile_id: string }>) {
    listingCount[r.owner_profile_id] = (listingCount[r.owner_profile_id] ?? 0) + 1;
  }

  const rows = (profiles ?? []).map((p: Record<string, unknown>) => {
    const displayName = String(p.display_name ?? "").trim();
    const username = String(p.username ?? "").trim();
    const bio = String(p.bio ?? "").trim();
    const hasAvatar = !!String(p.avatar_url ?? "").trim();
    const hasLocation = !!String(p.location_city ?? "").trim();
    const hasWebsite = !!String(p.website ?? "").trim();
    const listingsCount = listingCount[p.id as string] ?? 0;
    const bioSufficient = bio.length >= BIO_THRESHOLD;
    const shouldNoindex = !bioSufficient && listingsCount === 0;

    const checks: Array<{ id: string; status: SeoStatus; message: string }> = [];

    // Name / H1
    if (!displayName) checks.push({ id: "no-name", status: "FAIL", message: "Missing display name (H1 will be empty)" });
    else checks.push({ id: "name-ok", status: "PASS", message: "Display name present" });

    // Username / canonical URL
    if (!username) checks.push({ id: "no-username", status: "WARN", message: "No username — URL uses profile ID" });
    else checks.push({ id: "username-ok", status: "PASS", message: `Username: @${username}` });

    // Bio (meta description source)
    if (!bio) checks.push({ id: "bio-missing", status: "FAIL", message: "Missing bio (no meta description)" });
    else if (!bioSufficient) checks.push({ id: "bio-short", status: "WARN", message: `Bio short (${bio.length} chars, target ≥${BIO_THRESHOLD})` });
    else checks.push({ id: "bio-ok", status: "PASS", message: `Bio OK (${bio.length} chars)` });

    // Avatar / image SEO
    if (!hasAvatar) checks.push({ id: "no-avatar", status: "WARN", message: "No avatar — affects Open Graph image" });
    else checks.push({ id: "avatar-ok", status: "PASS", message: "Avatar present" });

    // Listings
    if (listingsCount === 0) checks.push({ id: "no-listings", status: "WARN", message: "No listings — thin profile page" });
    else checks.push({ id: "listings-ok", status: "PASS", message: `${listingsCount} listing(s)` });

    // Location
    if (!hasLocation) checks.push({ id: "no-location", status: "WARN", message: "No city set" });
    else checks.push({ id: "location-ok", status: "PASS", message: `City: ${p.location_city}` });

    // Thin content rule → noindex
    if (shouldNoindex) {
      checks.push({ id: "noindex-applied", status: "WARN", message: `Thin content rule: noindex applied (bio < ${BIO_THRESHOLD} chars AND 0 listings)` });
    } else {
      checks.push({ id: "indexed", status: "PASS", message: "Page is indexable" });
    }

    // ProfilePage structured data
    checks.push({ id: "structured-data", status: "PASS", message: "ProfilePage JSON-LD schema applied at page level" });

    const failCount = checks.filter((c) => c.status === "FAIL").length;
    const warnCount = checks.filter((c) => c.status === "WARN").length;
    const score = Math.max(0, 100 - failCount * 20 - warnCount * 8);

    return {
      id: String(p.id),
      display_name: displayName || "—",
      username,
      role: p.role,
      overall: pickStatus(score),
      score,
      checks,
      should_noindex: shouldNoindex,
      listings_count: listingsCount,
      edit_href: `/admin/profiles/${p.id}`,
    };
  });

  const filtered = filter ? rows.filter((r: { overall: string }) => r.overall === filter) : rows;
  return NextResponse.json({ data: filtered, total: count ?? 0, page, pageSize });
}
