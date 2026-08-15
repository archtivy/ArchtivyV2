import { NextRequest, NextResponse } from "next/server";
import { getInspirations, INSPIRATION_TABS, type InspirationTab } from "@/lib/db/inspirations";

/**
 * GET /api/inspirations
 *
 * Aggregated feed across project / product / material (spec §8).
 *
 * QUERY PARAMS follow the existing admin API convention — flat, camelCase, one
 * param per facet, `page` for pagination — rather than a single opaque filter
 * blob (§9.5). Repeatable params are read with getAll(), so
 * `?style=Minimalist&style=Brutalist` is an OR within a facet and an AND across
 * facets, matching how the filter rails already behave elsewhere.
 *
 *   ?q=          free text over title, attribution, location, taxonomy labels
 *   ?tab=        all | projects | products | materials
 *   ?style=      repeatable
 *   ?space=      repeatable
 *   ?element=    repeatable
 *   ?color=      repeatable
 *   ?category=   repeatable
 *   ?city=       repeatable
 *   ?yearMin=    integer
 *   ?yearMax=    integer
 *   ?hasProducts=1
 *   ?page=       1-based
 *   ?perPage=    capped at 60
 *
 * NOT IMPLEMENTED, because nothing backs them (§9.6): mood, awards, and the
 * interiors/exteriors tabs. They are absent rather than accepted-and-ignored —
 * a param that silently does nothing is worse than a 400.
 */

export const dynamic = "force-dynamic";

const KNOWN_PARAMS = new Set([
  "q", "tab", "style", "space", "element", "color", "category", "city",
  "yearMin", "yearMax", "hasProducts", "page", "perPage",
]);

/** Params the spec named but v1 cannot serve. Rejected loudly, not ignored. */
const DEFERRED_PARAMS: Record<string, string> = {
  mood: "No mood taxonomy exists yet — deferred to phase 2.",
  award: "No awards entity exists.",
  awards: "No awards entity exists.",
  shotType: "listing_images.shot_type is unclassified on all rows — deferred to phase 2.",
};

function intOrNull(v: string | null): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  for (const key of sp.keys()) {
    if (DEFERRED_PARAMS[key]) {
      return NextResponse.json(
        { error: `Unsupported filter "${key}". ${DEFERRED_PARAMS[key]}` },
        { status: 400 }
      );
    }
    if (!KNOWN_PARAMS.has(key)) {
      return NextResponse.json({ error: `Unknown parameter "${key}".` }, { status: 400 });
    }
  }

  const tabRaw = sp.get("tab")?.trim() as InspirationTab | null;
  const tab = tabRaw && INSPIRATION_TABS.includes(tabRaw) ? tabRaw : "all";

  const list = (key: string) => {
    const values = sp.getAll(key).flatMap((v) => v.split(",")).map((v) => v.trim()).filter(Boolean);
    return values.length ? values : undefined;
  };

  const result = await getInspirations({
    q: sp.get("q")?.trim() || undefined,
    tab,
    style: list("style"),
    space: list("space"),
    element: list("element"),
    color: list("color"),
    category: list("category"),
    city: list("city"),
    yearMin: intOrNull(sp.get("yearMin")),
    yearMax: intOrNull(sp.get("yearMax")),
    hasProducts: sp.get("hasProducts") === "1" || sp.get("hasProducts") === "true",
    page: intOrNull(sp.get("page")) ?? 1,
    perPage: intOrNull(sp.get("perPage")) ?? undefined,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
