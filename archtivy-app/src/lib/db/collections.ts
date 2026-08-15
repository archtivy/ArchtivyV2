/**
 * Collections repository (spec §5, §9.5, §11.5).
 *
 * A Collection is an AUTHORED editorial definition — slug, title, a real
 * description — plus a `taxonomy_filter_definition`, which is the saved query
 * that decides membership. Membership is materialised into `collection_items`
 * by the daily job (api/cron/collections-refresh), never computed per request.
 *
 * ── ON "CURATED BY ARCHTIVY AI" ─────────────────────────────────────────────
 * Nothing here generates a collection. The v1 scope contains no generation
 * model, and the SEO Bible requires genuinely distinct per-collection prose —
 * which is exactly what a template would fail to produce. So collections are
 * authored, and the job recomputes only WHICH ITEMS match. The UI must not
 * claim AI curation it does not do; the page says "Curated collections,
 * updated daily", which is true. Reported alongside this build.
 *
 * ── INDEXATION GATE (SEO Bible) ─────────────────────────────────────────────
 * `is_indexable` is derived by the job, not hand-set, so a collection that
 * decays below the item threshold de-indexes itself. The threshold is PENDING
 * a product decision in both Bibles; MIN_INDEXABLE_ITEMS below is a documented
 * default, not a silent guess — change it in one place when the number lands.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { InspirationItem, InspirationQuery } from "@/lib/db/inspirations";
import { getInspirationItemsByIds, getMatchingInspirationIds } from "@/lib/db/inspirations";

/**
 * PENDING (product): the SEO Bible flags this threshold as a product-tunable
 * parameter and explicitly declines to pick a number. 8 is a placeholder chosen
 * to be defensible, not authoritative — below roughly this many items a
 * collection page is a list, not a resource worth indexing. Revisit on decision.
 */
export const MIN_INDEXABLE_ITEMS = 8;

const UNDEFINED_TABLE = "42P01";

/**
 * The saved query. Deliberately a small, closed shape rather than arbitrary
 * SQL: it is validated before write, and it maps 1:1 onto the filters the feed
 * already supports, so a collection can never define membership the feed
 * cannot reproduce.
 */
export interface TaxonomyFilterDefinition {
  tab?: "all" | "projects" | "products" | "materials";
  style?: string[];
  space?: string[];
  element?: string[];
  color?: string[];
  category?: string[];
  yearMin?: number;
  yearMax?: number;
  hasProducts?: boolean;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  filter: TaxonomyFilterDefinition;
  itemCount: number;
  lastGeneratedAt: string | null;
  isIndexable: boolean;
  href: string;
}

export interface CollectionWithItems extends Collection {
  items: InspirationItem[];
}

type CollectionRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  taxonomy_filter_definition: unknown;
  item_count: number;
  last_generated_at: string | null;
  is_indexable: boolean;
};

/** Narrows unknown JSON to the closed shape above. Unknown keys are dropped. */
export function parseFilterDefinition(raw: unknown): TaxonomyFilterDefinition {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const strArray = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

  const tab = r.tab;
  return {
    tab:
      tab === "projects" || tab === "products" || tab === "materials" || tab === "all"
        ? tab
        : undefined,
    style: strArray(r.style),
    space: strArray(r.space),
    element: strArray(r.element),
    color: strArray(r.color),
    category: strArray(r.category),
    yearMin: num(r.yearMin),
    yearMax: num(r.yearMax),
    hasProducts: typeof r.hasProducts === "boolean" ? r.hasProducts : undefined,
  };
}

function toCollection(r: CollectionRow): Collection {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    filter: parseFilterDefinition(r.taxonomy_filter_definition),
    itemCount: r.item_count,
    lastGeneratedAt: r.last_generated_at,
    isIndexable: r.is_indexable,
    href: `/inspiration/${r.slug}`,
  };
}

const SELECT =
  "id, slug, title, description, taxonomy_filter_definition, item_count, last_generated_at, is_indexable";

async function fetchCollections(): Promise<Collection[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("collections")
    .select(SELECT)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    // Migration not applied yet — an empty list is the honest answer, and the
    // Inspiration page renders without the collections row rather than 500ing.
    if (error.code !== UNDEFINED_TABLE) {
      console.error("[collections] query failed:", error.message);
    }
    return [];
  }
  return ((data ?? []) as CollectionRow[]).map(toCollection);
}

export const getCollections = unstable_cache(fetchCollections, ["collections:list:v1"], {
  tags: [CACHE_TAGS.collections],
  revalidate: 3600,
});

async function fetchCollection(slug: string): Promise<CollectionWithItems | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("collections")
    .select(SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const collection = toCollection(data as CollectionRow);

  /*
   * Items come from the MATERIALISED membership, not by re-running the filter —
   * that is the whole point of the daily job (§5). The listing ids are then
   * hydrated through the feed repository so a collection card and a feed card
   * are built from one code path and cannot drift.
   */
  const { data: itemRows } = await sup
    .from("collection_items")
    .select("listing_id, sort_order")
    .eq("collection_id", collection.id)
    .order("sort_order", { ascending: true });

  const orderedIds = ((itemRows ?? []) as { listing_id: string }[]).map((r) => r.listing_id);
  if (orderedIds.length === 0) return { ...collection, items: [] };

  // Hydrated from the whole corpus, NOT through getInspirations() — that path
  // clamps perPage to 60, which silently truncated a 17-member collection to
  // the 2 members that happened to land in the first ranked page.
  const ordered = await getInspirationItemsByIds(orderedIds);

  return { ...collection, items: ordered };
}

export function getCollection(slug: string) {
  return unstable_cache(() => fetchCollection(slug), ["collections:detail", slug], {
    tags: [CACHE_TAGS.collections],
    revalidate: 3600,
  })();
}

/**
 * The filter, expressed as feed query params. One translation, used by both.
 * `perPage` is irrelevant to the job (which uses getMatchingInspirationIds) and
 * is left off rather than set to a number that implies a cap it does not apply.
 */
export function filterToQuery(f: TaxonomyFilterDefinition): InspirationQuery {
  return {
    tab: f.tab ?? "all",
    style: f.style,
    space: f.space,
    element: f.element,
    color: f.color,
    category: f.category,
    yearMin: f.yearMin ?? null,
    yearMax: f.yearMax ?? null,
    hasProducts: f.hasProducts,
  };
}

export interface RefreshReport {
  slug: string;
  before: number;
  after: number;
  isIndexable: boolean;
}

/**
 * Daily materialisation (§5). Idempotent, bounded, and safe to re-run: each
 * collection's membership is replaced wholesale, so a partial previous run
 * cannot leave duplicates behind.
 *
 * Materials are skipped as members — collection_items.listing_id is a real FK
 * to `listings`, and a material id would violate it. Collections are therefore
 * collections OF LISTINGS in v1; a material-backed collection needs a second
 * join column, which is not in scope.
 */
export async function refreshAllCollections(): Promise<RefreshReport[]> {
  const sup = getSupabaseServiceClient();

  const { data, error } = await sup
    .from("collections")
    .select(`${SELECT}, is_published`)
    .is("deleted_at", null);

  if (error) {
    if (error.code === UNDEFINED_TABLE) return [];
    throw new Error(`collections read failed: ${error.message}`);
  }

  const reports: RefreshReport[] = [];

  for (const row of (data ?? []) as (CollectionRow & { is_published: boolean })[]) {
    const collection = toCollection(row);
    // Unpaginated on purpose: getInspirations() caps a page at 60, which would
    // silently truncate any collection larger than that on every nightly run.
    // Materials are excluded because collection_items.listing_id is a real FK
    // to `listings`, and a material id would violate it.
    const members = await getMatchingInspirationIds(filterToQuery(collection.filter));

    const { error: delErr } = await sup
      .from("collection_items")
      .delete()
      .eq("collection_id", collection.id);
    if (delErr) {
      console.error(`[collections] clear failed for ${collection.slug}:`, delErr.message);
      continue;
    }

    if (members.length > 0) {
      const { error: insErr } = await sup.from("collection_items").insert(
        members.map((listingId, i) => ({
          collection_id: collection.id,
          listing_id: listingId,
          sort_order: i,
        }))
      );
      if (insErr) {
        console.error(`[collections] insert failed for ${collection.slug}:`, insErr.message);
        continue;
      }
    }

    // Derived, never hand-set: a collection that falls below the bar
    // de-indexes itself on the next run without anyone remembering to.
    const isIndexable = members.length >= MIN_INDEXABLE_ITEMS;

    await sup
      .from("collections")
      .update({
        item_count: members.length,
        last_generated_at: new Date().toISOString(),
        is_indexable: isIndexable,
      })
      .eq("id", collection.id);

    reports.push({
      slug: collection.slug,
      before: row.item_count,
      after: members.length,
      isIndexable,
    });
  }

  return reports;
}
