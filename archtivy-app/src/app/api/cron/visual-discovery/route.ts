import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkIdForAdmin } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { processImage } from "@/lib/matches/pipeline";

/**
 * Visual-discovery precompute — the batch that makes the lightbox feeds work.
 *
 * For each image it does one vision call and one embedding, and for project
 * photographs it rewrites the clickable object regions and their product
 * candidates. Nothing a reader does ever triggers this.
 *
 * ── TWO CALLERS, ONE BODY ───────────────────────────────────────────────────
 * Vercel's scheduler (bearer CRON_SECRET) and an admin pressing a button in
 * /admin/tools. Both land here; there is no second batch implementation.
 * FAILS CLOSED when CRON_SECRET is unset, matching collections-refresh, so an
 * endpoint that spends money cannot become unauthenticated by omission.
 *
 * ── IT WILL NOT RUN AWAY WITH THE BUDGET ────────────────────────────────────
 * `limit` is capped hard, and the default mode only touches images that have
 * no usable vector yet. A full re-run of an already-processed catalogue takes
 * an explicit ?mode=all, so the expensive thing is never the thing that
 * happens by accident.
 */

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** Hard ceiling per invocation, whatever the caller asks for. */
const MAX_LIMIT = 250;
const DEFAULT_LIMIT = 40;

async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return null;

  // Otherwise it must be a signed-in admin.
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const res = await getProfileByClerkIdForAdmin(userId);
  const profile = res.data as { is_admin?: boolean } | null;
  if (res.error || !profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

interface Candidate {
  id: string;
  image_url: string;
  listing_id: string;
  listing_type: "project" | "product";
}

/**
 * Which images still need work.
 *
 * "missing" — the default — is every approved project/product image with no
 * image_ai row carrying a vector. Note that a row can EXIST and still be
 * unusable: 845 of the 1000 sampled hold the synthetic URL-hash vector the old
 * embedding fallback wrote. Those are indistinguishable from real ones in SQL,
 * which is why replacing them needs mode=all rather than a cleverer query.
 */
async function selectImages(mode: "missing" | "all", limit: number): Promise<Candidate[]> {
  const sup = getSupabaseServiceClient();

  const { data: listings } = await sup
    .from("listings")
    .select("id, type")
    .in("type", ["project", "product"])
    .eq("status", "APPROVED")
    .is("deleted_at", null);

  const typeById = new Map<string, "project" | "product">();
  for (const l of (listings ?? []) as { id: string; type: string }[]) {
    if (l.type === "project" || l.type === "product") typeById.set(l.id, l.type);
  }
  if (typeById.size === 0) return [];

  /*
   * ── PAGED, BECAUSE POSTGREST STOPS AT 1000 ─────────────────────────────────
   * The default response cap is 1000 rows and listing_images already holds
   * 1197. An unpaged select here would silently drop every image past the
   * first thousand and the job would report itself finished with a couple of
   * hundred photographs never processed — the same truncation that cut 28
   * categories out of the sitemap. Both reads below page explicitly.
   */
  const images = await selectAll<{ id: string; image_url: string; listing_id: string }>(
    () => sup.from("listing_images").select("id, image_url, listing_id").order("id", { ascending: true })
  );

  let rows = images
    .filter((r) => r.image_url && typeById.has(r.listing_id))
    .map((r) => ({ ...r, listing_type: typeById.get(r.listing_id)! }));

  if (mode === "missing") {
    const existing = await selectAll<{ image_id: string }>(
      () => sup.from("image_ai").select("image_id").not("embedding", "is", null).order("image_id", { ascending: true })
    );
    const done = new Set(existing.map((r) => r.image_id));
    rows = rows.filter((r) => !done.has(r.id));
  }

  return rows.slice(0, limit);
}

const PAGE = 1000;

/** Read every row of a query, a page at a time. */
async function selectAll<T>(build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) break;
    const page = (data ?? []) as T[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

async function run(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return denied;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "all" ? "all" : "missing";
  const limit = Math.max(
    1,
    Math.min(MAX_LIMIT, parseInt(params.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  /* A dry run reports exactly what a real run would touch and spends nothing.
     Always the first thing to reach for before a catalogue-wide pass. */
  const dryRun = params.get("dryRun") === "1";

  const images = await selectImages(mode, limit);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      mode,
      limit,
      wouldProcess: images.length,
      projects: images.filter((i) => i.listing_type === "project").length,
      products: images.filter((i) => i.listing_type === "product").length,
    });
  }

  const started = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let embedded = 0;
  let regions = 0;

  /*
   * ── STOP BEFORE THE PLATFORM DOES ──────────────────────────────────────────
   * maxDuration is 300s and a project photograph takes 6–9s end to end, so a
   * batch of forty cannot finish inside one invocation. A killed invocation is
   * the worst outcome available: the images already paid for are written, but
   * the caller gets no response and no count, so nobody knows where the run
   * stopped. Instead the loop stops itself with time to spare and reports what
   * is left, which makes any `limit` safe to ask for.
   */
  const budgetMs = 240_000;
  let stoppedEarly = false;

  for (const img of images) {
    if (Date.now() - started > budgetMs) {
      stoppedEarly = true;
      break;
    }
    const result = await processImage({
      imageId: img.id,
      source: img.listing_type,
      imageUrl: img.image_url,
      listing_id: img.listing_id,
      listing_type: img.listing_type,
    });
    processed++;
    if (result.ok) {
      if (result.embedded) embedded++;
      regions += result.regions ?? 0;
    } else if (result.error && errors.length < 20) {
      errors.push(`${img.id}: ${result.error}`);
    }
  }

  return NextResponse.json({
    mode,
    processed,
    embedded,
    regions,
    /* Only meaningful for "missing", where finished work leaves the queue. A
       mode=all run never shrinks its own queue, so a number here would be the
       same one every time and read as no progress. */
    remaining: mode === "missing" ? (await selectImages("missing", MAX_LIMIT)).length : null,
    stoppedEarly,
    seconds: Math.round((Date.now() - started) / 1000),
    errors,
  });
}

export const GET = run;
export const POST = run;
