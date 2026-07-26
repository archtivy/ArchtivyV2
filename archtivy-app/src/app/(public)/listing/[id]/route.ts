import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl, getAbsoluteUrl } from "@/lib/canonical";
import { getListingTaxonomyPath } from "@/lib/taxonomy/resolve";

/**
 * Legacy V1 route: /listing/{slug}.
 *
 * This is the URL shape Google indexed before the V2 migration, and it is the single
 * most damaging SEO defect on the site (TECHNICAL_SEO_AUDIT.md C-2). It previously
 * rendered a bare `notFound()` page stub, which production served as **HTTP 200 with
 * an empty shell and `<meta name="robots" content="noindex">`** — a soft 404 sitting
 * on top of the entire pre-existing index.
 *
 * Implemented as a Route Handler rather than a page **on purpose**. A page calling
 * `notFound()` here was measured returning 200, not 404, on a real production build:
 * once a dynamic page begins streaming, the status code is already committed and the
 * not-found boundary cannot change it. A Route Handler sets the status explicitly, so
 * the contract is exact and testable.
 *
 * Behaviour:
 *   - slug (or id) resolves to an approved listing → **308** to the canonical
 *     taxonomy-aware /projects/… or /products/… URL.
 *   - no match → **410 Gone**. The V1 content set was replaced wholesale, so these
 *     URLs are permanently removed rather than temporarily missing; 410 gets them
 *     dropped from the index faster than 404 and cannot be mistaken for a soft 404.
 */
export const dynamic = "force-dynamic";

type LegacyMatch = {
  id: string;
  type: "project" | "product";
  slug: string | null;
};

/** Look a legacy segment up by slug first, then by id. Returns null when unknown. */
async function findLegacyListing(segment: string): Promise<LegacyMatch | null> {
  const value = segment.trim();
  if (!value) return null;

  const supabase = getSupabaseServiceClient();

  const bySlug = await supabase
    .from("listings")
    .select("id, type, slug")
    .eq("slug", value)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (bySlug.data) return bySlug.data as LegacyMatch;

  // UUID-shaped legacy links also existed; resolve them the same way.
  const byId = await supabase
    .from("listings")
    .select("id, type, slug")
    .eq("id", value)
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (byId.data) return byId.data as LegacyMatch;

  return null;
}

const GONE_BODY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex,follow">
<title>This page has moved — Archtivy</title>
</head><body>
<h1>This page is no longer available</h1>
<p>Archtivy has moved to a new structure. Browse
<a href="/projects">architecture projects</a> or
<a href="/products">building products</a>.</p>
</body></html>`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const segment = decodeURIComponent(id);

  const match = await findLegacyListing(segment);

  if (!match) {
    return new NextResponse(GONE_BODY, {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, follow",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const taxPath = await getListingTaxonomyPath(match.id);
  const target = getListingUrl({
    id: match.id,
    type: match.type,
    slug: match.slug,
    taxonomySlugPath: taxPath.primary?.slug_path ?? null,
  });

  return NextResponse.redirect(getAbsoluteUrl(target), 308);
}
