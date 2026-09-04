import { waitUntil } from "@vercel/functions";
import { getBaseUrl } from "@/lib/canonical";

/**
 * Ask our own image optimiser for a listing's hero variants the moment the
 * listing goes live, so the first reader is not the one who pays for them.
 *
 * ── THE COST THIS MOVES ─────────────────────────────────────────────────────
 * Measured against a production build: the first request for a project hero
 * takes 3.4–7.9s while Next downloads the original from Supabase storage,
 * decodes it and re-encodes it at the requested width. Served from the
 * optimiser's cache the identical request takes ~2ms. Cold LCP on a project
 * detail page was 6.3s against 0.9s warm, and that gap IS the first reader's
 * experience of a newly published listing.
 *
 * Nothing here touches the stored original. This requests exactly the URL a
 * browser would request — same path, same width, same quality — so the bytes
 * that land in the cache are the bytes Next would have produced anyway, at the
 * moment a reader asked. It is the same work, done earlier, by us.
 *
 * ── NO NEW LOSSY LAYER ──────────────────────────────────────────────────────
 * There is deliberately no encoder, no resize and no quality parameter of our
 * own invention in this file. `q=75` is Next's own default, read straight off
 * the srcset the live page emits. If the site's image settings change, warming
 * follows them, because it is asking the same endpoint the page asks.
 *
 * ── WHICH WIDTHS ────────────────────────────────────────────────────────────
 * The hero renders at `sizes="(max-width: 1024px) 100vw, 66vw"`, so the rung a
 * browser picks depends on the viewport:
 *
 *   phone   390 CSS @2x  → ~780px  → 828
 *   laptop 1440 CSS @1x  → ~950px  → 1080
 *   desktop 1920 CSS @1x → ~1267px → 1920
 *
 * Those three cover the overwhelming majority of real first views. The 2048
 * and 3840 rungs are deliberately NOT warmed: they are reached only by very
 * wide or high-DPI displays, and warming them would spend the most expensive
 * encodes on the least common visitors — the opposite of the point.
 */

/** Next's default quality, and what the live srcset actually requests. */
const QUALITY = 75;

/**
 * The rungs worth warming. Every value here must exist in Next's `deviceSizes`
 * or the optimiser will round to a neighbour and the warmed entry will not be
 * the one the browser asks for.
 */
const HERO_WIDTHS = [828, 1080, 1920] as const;

/** Per-process memo of what has already been asked for. */
const warmed = new Set<string>();

/**
 * A single warm attempt must never outlive the request that triggered it by
 * much, and must never hold a publish open.
 */
const TIMEOUT_MS = 8000;

function variantUrl(base: string, imageUrl: string, width: number): string {
  return `${base}/_next/image?url=${encodeURIComponent(imageUrl)}&w=${width}&q=${QUALITY}`;
}

export interface PrewarmResult {
  attempted: number;
  ok: number;
  skipped: number;
}

/**
 * Warm the hero variants for one listing image.
 *
 * Resolves when the requests settle, but callers are expected NOT to await it
 * — see `prewarmHeroInBackground`. Never throws.
 */
export async function prewarmHeroImage(imageUrl: string | null | undefined): Promise<PrewarmResult> {
  const result: PrewarmResult = { attempted: 0, ok: 0, skipped: 0 };
  const url = imageUrl?.trim();
  if (!url) return result;

  // Relative and data URLs are not served through the optimiser in a way worth
  // warming, and a malformed one is not worth a request at all.
  if (!/^https?:\/\//i.test(url)) return result;

  const base = getBaseUrl();
  if (!base) return result;

  await Promise.all(
    HERO_WIDTHS.map(async (w) => {
      const target = variantUrl(base, url, w);
      if (warmed.has(target)) {
        result.skipped++;
        return;
      }
      warmed.add(target);
      result.attempted++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        // The response body is the point of the exercise only insofar as
        // producing it fills the cache; it is discarded here.
        const res = await fetch(target, { signal: controller.signal, cache: "no-store" });
        if (res.ok) {
          await res.arrayBuffer().catch(() => undefined);
          result.ok++;
        } else {
          // A failed warm must not poison the memo — the next publish, or the
          // first reader, should be free to try again.
          warmed.delete(target);
          console.warn(`[prewarmHero] ${res.status} for w=${w} at ${base}`);
        }
      } catch (err) {
        warmed.delete(target);
        /*
         * Logged, not swallowed. This is best-effort work whose only failure
         * mode is that a reader pays a cost they would have paid anyway — but
         * a warm that silently never runs is indistinguishable from one that
         * never helped, and on a platform that may suspend background work
         * after a response (see the note on the export below) that is exactly
         * the thing worth being able to see in the logs.
         */
        const reason = err instanceof Error ? err.name : String(err);
        console.warn(`[prewarmHero] failed for w=${w} at ${base}: ${reason}`);
      } finally {
        clearTimeout(timer);
      }
    })
  );

  return result;
}

/**
 * Fire-and-forget wrapper for use inside a publish path.
 *
 * Returns immediately — publishing never waits for image encoding — and every
 * failure inside is caught and logged rather than thrown, so no rejection can
 * escape to become an unhandled one.
 *
 * ── WHY waitUntil ───────────────────────────────────────────────────────────
 * Starting the work and not awaiting it is not enough on Vercel. A Node
 * serverless function may be frozen or torn down the moment its response has
 * been sent, so a promise left running can simply be cut off mid-request — the
 * warming would appear to have been wired up and would silently never finish.
 *
 * `waitUntil` is the platform's supported answer: it asks Vercel to keep the
 * instance alive until the promise settles, WITHOUT holding the response open.
 * The publish action still returns at exactly the same moment; only the
 * teardown is deferred.
 *
 * Next 14.2 has no `after()` of its own — that arrived in 15 — so
 * `@vercel/functions` is the smallest supported way to reach this. Only
 * `waitUntil` is imported; the package's OIDC and CLI helpers are never
 * referenced and do not enter the bundle.
 *
 * ── AND OFF VERCEL ──────────────────────────────────────────────────────────
 * Outside a Vercel request context `waitUntil` returns without throwing, and
 * the promise runs to completion anyway because nothing is tearing the process
 * down — local development and the production build behave exactly as before.
 * It is wrapped regardless, because a background helper that can throw inside
 * a publish path would defeat the entire point of it being background.
 */
export function prewarmHeroInBackground(imageUrl: string | null | undefined): void {
  // Already terminal: prewarmHeroImage never rejects, and this catch is the
  // belt to that brace, so what `waitUntil` receives can only ever resolve.
  const work = prewarmHeroImage(imageUrl).catch((err) => {
    console.warn("[prewarmHero] unexpected failure:", err);
  });

  try {
    waitUntil(work);
  } catch (err) {
    // No request context, or a platform that does not offer one. The work is
    // already running; this only means nobody is holding the door open for it.
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[prewarmHero] waitUntil unavailable, continuing best-effort: ${reason}`);
  }
}
