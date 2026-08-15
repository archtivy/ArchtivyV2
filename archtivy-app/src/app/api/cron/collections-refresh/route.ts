import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { refreshAllCollections } from "@/lib/db/collections";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Daily collection materialisation (spec §5).
 *
 * Recomputes membership for every collection from its taxonomy_filter_definition
 * and writes it into collection_items, so the landing pages never compute
 * membership per request.
 *
 * Scheduled by vercel.json `crons`. Vercel signs its cron requests with
 * CRON_SECRET as a bearer token; this route FAILS CLOSED if that variable is
 * unset, so an unprotected endpoint cannot exist by omission — the same
 * decision already made for /api/revalidate.
 *
 * Idempotent and safe to re-run by hand: each collection's membership is
 * replaced wholesale rather than merged.
 *
 * ── AI INTEGRATION NOTE ─────────────────────────────────────────────────────
 * This job runs a saved taxonomy query. It does not call a model, and it does
 * not generate collections — those are authored. So the Engineering Bible's
 * "AI suggestions must pass validation before modifying production data" has
 * nothing to gate here: there is no AI in this path. The moderation-gate
 * question left open in §10 applies to a generation feature that does not
 * exist yet.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * REQUIRED, not defensive. `dynamic = "force-dynamic"` stops the ROUTE being
 * cached; it does not stop Next from caching the `fetch` calls supabase-js makes
 * underneath. Without this, the job re-read a cached copy of `collections` on
 * every invocation after the first in the same server process — caught during
 * verification, where a second run reported `before: 0` while the table held 17.
 *
 * The visible symptom was a wrong number in the response. The real risk is that
 * an edited `taxonomy_filter_definition` would be invisible to the job, so a
 * collection would keep materialising against its previous definition
 * indefinitely.
 */
export const fetchCache = "force-no-store";

function authorise(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorise(request)) {
    return NextResponse.json(
      { error: "Unauthorised. Set CRON_SECRET and send it as a bearer token." },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  try {
    const reports = await refreshAllCollections();

    revalidateTag(CACHE_TAGS.collections);

    const changed = reports.filter((r) => r.before !== r.after);
    const deindexed = reports.filter((r) => !r.isIndexable);

    // Observable, per Coding Standards' background-job rules: the log says what
    // moved, not just that the job ran.
    console.log(
      `[collections-refresh] ${reports.length} collections in ${Date.now() - startedAt}ms; ` +
        `${changed.length} changed membership; ${deindexed.length} below the indexable threshold`
    );

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      collections: reports.length,
      changed: changed.map((r) => ({ slug: r.slug, before: r.before, after: r.after })),
      deindexed: deindexed.map((r) => r.slug),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[collections-refresh] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
