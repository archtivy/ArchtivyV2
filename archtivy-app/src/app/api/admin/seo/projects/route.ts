export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type SeoStatus = "PASS" | "WARN" | "FAIL";

interface SeoCheck {
  id: string;
  status: SeoStatus;
  message: string;
}

interface SeoRow {
  id: string;
  title: string;
  slug: string | null;
  overall: SeoStatus;
  score: number;
  checks: SeoCheck[];
  edit_href: string;
}

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
  const filter = searchParams.get("filter") ?? ""; // FAIL | WARN | PASS | ""
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: listings, count, error } = await supabase
    .from("listings")
    .select("id,title,description,location,year,cover_image_url,slug,team_members", { count: "exact" })
    .eq("type", "project")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (listings ?? []).map((l: { id: string }) => l.id);

  const [imagesRes, linksRes] = await Promise.all([
    ids.length
      ? supabase.from("listing_images").select("listing_id,alt").in("listing_id", ids)
      : { data: [] },
    ids.length
      ? supabase.from("project_product_links").select("project_id").in("project_id", ids)
      : { data: [] },
  ]);

  const altStats: Record<string, { total: number; withAlt: number; urls: string[] }> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string; alt: string | null; image_url?: string }>) {
    const s = (altStats[r.listing_id] ??= { total: 0, withAlt: 0, urls: [] });
    s.total += 1;
    if (r.alt?.trim()) s.withAlt += 1;
  }
  const linkCount: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ project_id: string }>) {
    linkCount[r.project_id] = (linkCount[r.project_id] ?? 0) + 1;
  }

  const slugsSeen = new Map<string, string>();

  const rows: SeoRow[] = (listings ?? []).map((l: Record<string, unknown>) => {
    const title = String(l.title ?? "").trim();
    const description = String(l.description ?? "").trim();
    const slug = l.slug ? String(l.slug).trim() : null;
    const hasLocation = !!String(l.location ?? "").trim();
    const hasYear = !!l.year;
    const hasCover = !!String(l.cover_image_url ?? "").trim();
    const altStat = altStats[l.id as string] ?? { total: 0, withAlt: 0 };
    const altCoverage = altStat.total ? altStat.withAlt / altStat.total : 1;
    const links = linkCount[l.id as string] ?? 0;
    const wordCount = description ? description.split(/\s+/).filter(Boolean).length : 0;
    const hasTeam = Array.isArray(l.team_members) && (l.team_members as unknown[]).length > 0;

    const checks: SeoCheck[] = [];

    // Title
    if (!title) checks.push({ id: "title-missing", status: "FAIL", message: "Missing title" });
    else if (title.length < 10) checks.push({ id: "title-short", status: "WARN", message: `Title too short (${title.length} chars)` });
    else if (title.length > 70) checks.push({ id: "title-long", status: "WARN", message: `Title too long (${title.length} chars, ideal ≤70)` });
    else checks.push({ id: "title-ok", status: "PASS", message: "Title OK" });

    // Description
    if (!description) checks.push({ id: "desc-missing", status: "FAIL", message: "Missing description" });
    else if (wordCount < 50) checks.push({ id: "desc-thin", status: "WARN", message: `Thin content (${wordCount} words, target ≥50)` });
    else if (wordCount >= 150) checks.push({ id: "desc-ok", status: "PASS", message: `Description OK (${wordCount} words)` });
    else checks.push({ id: "desc-ok", status: "PASS", message: `Description OK (${wordCount} words)` });

    // Meta description approximation (first 160 chars of description)
    if (description) {
      const metaLen = Math.min(description.length, 160);
      if (metaLen < 50) checks.push({ id: "meta-desc-short", status: "WARN", message: `Meta description preview short (${metaLen} chars)` });
      else if (metaLen > 160) checks.push({ id: "meta-desc-long", status: "WARN", message: "Meta description may be truncated" });
      else checks.push({ id: "meta-desc-ok", status: "PASS", message: `Meta description length OK (${metaLen} chars)` });
    }

    // Cover image
    if (!hasCover) checks.push({ id: "cover-missing", status: "FAIL", message: "Missing cover image" });
    else checks.push({ id: "cover-ok", status: "PASS", message: "Cover image present" });

    // Alt text
    if (altStat.total === 0) checks.push({ id: "alt-no-images", status: "WARN", message: "No gallery images" });
    else if (altCoverage < 0.8) checks.push({ id: "alt-low", status: "WARN", message: `Alt text coverage low (${Math.round(altCoverage * 100)}%)` });
    else checks.push({ id: "alt-ok", status: "PASS", message: `Alt text coverage ${Math.round(altCoverage * 100)}%` });

    // Location
    if (!hasLocation) checks.push({ id: "location-missing", status: "WARN", message: "Missing location" });
    else checks.push({ id: "location-ok", status: "PASS", message: "Location present" });

    // Year
    if (!hasYear) checks.push({ id: "year-missing", status: "WARN", message: "Missing year" });
    else checks.push({ id: "year-ok", status: "PASS", message: "Year present" });

    // Product connections
    if (links === 0) checks.push({ id: "no-products", status: "WARN", message: "No product links (reduces connection density)" });
    else checks.push({ id: "products-ok", status: "PASS", message: `${links} product links` });

    // Team
    if (!hasTeam) checks.push({ id: "no-team", status: "WARN", message: "No team members" });
    else checks.push({ id: "team-ok", status: "PASS", message: "Team present" });

    // Slug / canonical
    if (!slug) checks.push({ id: "no-slug", status: "WARN", message: "No slug — URL uses ID, not canonical text" });
    else {
      const existing = slugsSeen.get(slug);
      if (existing && existing !== String(l.id)) {
        checks.push({ id: "dup-slug", status: "FAIL", message: `Duplicate slug: "${slug}"` });
      } else {
        slugsSeen.set(slug, String(l.id));
        checks.push({ id: "slug-ok", status: "PASS", message: `Slug: ${slug}` });
      }
    }

    // Structured data reminder
    checks.push({ id: "structured-data", status: "PASS", message: "CreativeWork JSON-LD schema applied at page level" });

    const failCount = checks.filter((c) => c.status === "FAIL").length;
    const warnCount = checks.filter((c) => c.status === "WARN").length;
    const score = Math.max(0, 100 - failCount * 20 - warnCount * 8);

    return {
      id: String(l.id),
      title: title || "—",
      slug,
      overall: pickStatus(score),
      score,
      checks,
      edit_href: `/admin/projects/${l.id}`,
    };
  });

  const filtered = filter ? rows.filter((r) => r.overall === filter) : rows;

  return NextResponse.json({ data: filtered, total: count ?? 0, page, pageSize });
}
