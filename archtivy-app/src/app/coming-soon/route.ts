import { comingSoonResponse } from "@/lib/comingSoon";
import { getPlatformTotals } from "@/lib/db/platformTotals";

/**
 * GET /coming-soon — renders the pre-launch gate.
 *
 * Middleware rewrites every gated request here, so this handler produces the
 * response the visitor actually sees while their URL stays unchanged.
 *
 * A Route Handler rather than a page.tsx, for two reasons:
 *
 *  1. Status control. The gate answers 503 + Retry-After. A page.tsx always
 *     renders 200 unless it calls notFound(), and Next gives no way to set an
 *     arbitrary status from a page — the same trap that made /listing/[id]
 *     return 200 while calling notFound(), fixed in 1498d7e.
 *
 *  2. Standalone by construction. Route Handlers are not wrapped by layouts, so
 *     this cannot pick up SiteShell, TopNav or Footer even by accident. That
 *     also avoids TopNav's client fetch to /api/user-profile-data, which is
 *     gated and would fail here.
 *
 * Runs on the Node runtime (the default) because getPlatformTotals() uses the
 * Supabase service client and unstable_cache, neither of which works on edge.
 * That is the whole reason middleware rewrites here instead of answering itself.
 *
 * Cost: getPlatformTotals() is cached for 1 hour and shares its cache entry and
 * tags with the homepage hero, so gated traffic adds no DB load beyond the
 * first request per hour — and the figures can never disagree with the
 * homepage's, since it is literally the same source.
 */

export async function GET(): Promise<Response> {
  const totals = await getPlatformTotals();
  return comingSoonResponse(totals);
}
