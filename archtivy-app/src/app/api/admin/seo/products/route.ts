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

  const { data: listings, count, error } = await supabase
    .from("listings")
    .select("id,title,description,cover_image_url,slug,product_type,category,material_or_finish,feature_highlight", { count: "exact" })
    .eq("type", "product")
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
      ? supabase.from("project_product_links").select("product_id").in("product_id", ids)
      : { data: [] },
  ]);

  const altStats: Record<string, { total: number; withAlt: number }> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string; alt: string | null }>) {
    const s = (altStats[r.listing_id] ??= { total: 0, withAlt: 0 });
    s.total += 1;
    if (r.alt?.trim()) s.withAlt += 1;
  }
  const usedIn: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ product_id: string }>) {
    usedIn[r.product_id] = (usedIn[r.product_id] ?? 0) + 1;
  }

  const slugsSeen = new Map<string, string>();

  const rows = (listings ?? []).map((l: Record<string, unknown>) => {
    const title = String(l.title ?? "").trim();
    const description = String(l.description ?? "").trim();
    const slug = l.slug ? String(l.slug).trim() : null;
    const hasCover = !!String(l.cover_image_url ?? "").trim();
    const hasType = !!String(l.product_type ?? "").trim();
    const altStat = altStats[l.id as string] ?? { total: 0, withAlt: 0 };
    const altCoverage = altStat.total ? altStat.withAlt / altStat.total : 1;
    const projectLinks = usedIn[l.id as string] ?? 0;
    const wordCount = description ? description.split(/\s+/).filter(Boolean).length : 0;

    const checks: SeoCheck[] = [];

    if (!title) checks.push({ id: "title-missing", status: "FAIL", message: "Missing title" });
    else if (title.length < 5) checks.push({ id: "title-short", status: "WARN", message: `Title too short` });
    else if (title.length > 70) checks.push({ id: "title-long", status: "WARN", message: `Title too long (${title.length} chars)` });
    else checks.push({ id: "title-ok", status: "PASS", message: "Title OK" });

    if (!description) checks.push({ id: "desc-missing", status: "FAIL", message: "Missing description" });
    else if (wordCount < 20) checks.push({ id: "desc-thin", status: "WARN", message: `Thin content (${wordCount} words)` });
    else checks.push({ id: "desc-ok", status: "PASS", message: `Description OK (${wordCount} words)` });

    if (!hasCover) checks.push({ id: "cover-missing", status: "FAIL", message: "Missing cover image" });
    else checks.push({ id: "cover-ok", status: "PASS", message: "Cover image present" });

    if (altStat.total === 0) checks.push({ id: "alt-no-images", status: "WARN", message: "No gallery images" });
    else if (altCoverage < 0.8) checks.push({ id: "alt-low", status: "WARN", message: `Alt text ${Math.round(altCoverage * 100)}%` });
    else checks.push({ id: "alt-ok", status: "PASS", message: "Alt text OK" });

    if (!hasType) checks.push({ id: "no-type", status: "WARN", message: "Product type missing (affects Product schema)" });
    else checks.push({ id: "type-ok", status: "PASS", message: "Product type set" });

    if (projectLinks === 0) checks.push({ id: "not-used", status: "WARN", message: "Not used in any project" });
    else checks.push({ id: "used-ok", status: "PASS", message: `Used in ${projectLinks} project(s)` });

    if (!slug) checks.push({ id: "no-slug", status: "WARN", message: "No slug" });
    else {
      const existing = slugsSeen.get(slug);
      if (existing && existing !== String(l.id)) {
        checks.push({ id: "dup-slug", status: "FAIL", message: `Duplicate slug: "${slug}"` });
      } else {
        slugsSeen.set(slug, String(l.id));
        checks.push({ id: "slug-ok", status: "PASS", message: `Slug: ${slug}` });
      }
    }

    checks.push({ id: "structured-data", status: "PASS", message: "Product JSON-LD schema applied at page level" });

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
      edit_href: `/admin/products/${l.id}`,
    };
  });

  const filtered = filter ? rows.filter((r: { overall: string }) => r.overall === filter) : rows;
  return NextResponse.json({ data: filtered, total: count ?? 0, page, pageSize });
}
