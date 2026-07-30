/**
 * Secret-protected cache revalidation endpoint.
 *
 * WHY THIS EXISTS: taxonomy and listing data can be changed directly in the
 * database by migration (see supabase/migrations/20260730110000_d7_resolution).
 * Those writes bypass every server action, so nothing calls revalidateTag and
 * archive pages keep serving stale data for the full 3600s TTL. Before this
 * route the only ways to bust the cache were a redeploy or an unrelated admin
 * edit made purely for its side effect.
 *
 * NOT an admin route: it is called by tooling and CI, which have no Clerk
 * session, so it authenticates with a shared secret instead of requireAdminApi.
 *
 * Usage:
 *   curl -X POST https://archtivy.com/api/revalidate \
 *     -H "content-type: application/json" \
 *     -H "x-revalidate-secret: $REVALIDATE_SECRET" \
 *     -d '{"tags":["listings"]}'
 */

import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { CACHE_TAGS } from "@/lib/cache-tags";

export const runtime = "nodejs"; // node:crypto is unavailable on the edge runtime
export const dynamic = "force-dynamic";

const ALLOWED_TAGS = new Set<string>(Object.values(CACHE_TAGS));

/**
 * Constant-time comparison. A plain `===` leaks the secret one character at a
 * time to an attacker who can measure response latency.
 *
 * timingSafeEqual throws on length mismatch, which would itself leak the
 * length — so both sides are hashed to a fixed width first.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a comparison so the mismatch path costs the same.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET;

  // Fail closed. An unset secret must never mean "open to everyone" — this
  // endpoint can otherwise be used to force cache stampedes against the DB.
  // Returns 401 rather than 503 so an unconfigured deployment is
  // indistinguishable from a wrong secret.
  if (!expected) {
    console.error("[revalidate] REVALIDATE_SECRET is not set; endpoint disabled");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provided = request.headers.get("x-revalidate-secret") ?? "";
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tags?: unknown; paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json({ error: "provide at least one of: tags, paths" }, { status: 400 });
  }

  // Allowlist tags. Revalidating an arbitrary attacker-supplied tag is harmless
  // in itself, but rejecting unknown names turns a silent typo — "listing"
  // instead of "listings" — into a visible 400 rather than a no-op that looks
  // like success.
  const unknownTags = tags.filter((t) => !ALLOWED_TAGS.has(t));
  if (unknownTags.length > 0) {
    return NextResponse.json(
      { error: `unknown tag(s): ${unknownTags.join(", ")}`, allowed: [...ALLOWED_TAGS] },
      { status: 400 }
    );
  }

  // Paths must be site-relative. Blocks absolute URLs and traversal.
  const badPaths = paths.filter((p) => !p.startsWith("/") || p.includes(".."));
  if (badPaths.length > 0) {
    return NextResponse.json(
      { error: `paths must start with "/" and contain no "..": ${badPaths.join(", ")}` },
      { status: 400 }
    );
  }

  for (const tag of tags) revalidateTag(tag);
  for (const path of paths) revalidatePath(path);

  return NextResponse.json(
    { revalidated: true, tags, paths, at: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}

/**
 * Explicit 405 for GET. Without this, a bare GET would 405 anyway, but a
 * revalidation endpoint reachable by GET is a classic accidental-CSRF and
 * link-prefetch hazard — worth stating rather than inheriting.
 */
export async function GET() {
  return NextResponse.json({ error: "method not allowed; use POST" }, { status: 405 });
}
