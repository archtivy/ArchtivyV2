import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { Candidate } from "./types";

/**
 * The pool every personalized surface ranks over.
 *
 * ── ONE POOL, FETCHED ONCE, SHARED BY EVERYONE ──────────────────────────────
 * Scoring is per-viewer; the candidates are not. The same few hundred approved
 * listings are ranked differently for each person, so fetching them per viewer
 * would multiply identical work by the number of readers. The pool is built
 * once, cached for everyone, and scored in memory — which is what keeps a
 * personalized homepage down to roughly two queries per viewer instead of
 * dozens.
 *
 * Six batched queries build it, none of them per-listing. There is no N+1 here
 * and there must not be one added.
 */

const POOL_SIZE = 400;
const POOL_TTL_SECONDS = 600;
const PAGE = 1000;

async function selectAll<T>(
  build: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown; error: unknown }> }
): Promise<T[]> {
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

/**
 * The uncached builder.
 *
 * Exported so the ranking can be exercised from a script: unstable_cache needs
 * Next's request context and throws outside it, which would otherwise make the
 * whole personalization layer untestable except through a running server.
 */
export async function buildCandidatePool(): Promise<Candidate[]> {
  const sup = getSupabaseServiceClient();

  /*
   * Only ever APPROVED and not soft-deleted. This is the single place the
   * visibility rule is applied for personalization, so a draft, a private or a
   * removed listing cannot reach a feed or a notification by any path.
   */
  const { data: rows } = await sup
    .from("listings")
    .select(
      "id, type, slug, title, created_at, owner_profile_id, location_city, location_country, location_lat, location_lng, views_count"
    )
    .in("type", ["project", "product"])
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(POOL_SIZE);

  const listings = (rows ?? []) as {
    id: string;
    type: "project" | "product";
    slug: string | null;
    title: string | null;
    created_at: string;
    owner_profile_id: string | null;
    location_city: string | null;
    location_country: string | null;
    location_lat: number | null;
    location_lng: number | null;
    views_count: number | null;
  }[];
  if (listings.length === 0) return [];

  const ids = listings.map((l) => l.id);

  const [taxRes, teamRes, projMatRes, prodMatRes, linkRes] = await Promise.all([
    selectAll<{
      listing_id: string;
      taxonomy_nodes: { id: string; slug_path: string; domain: string } | { id: string; slug_path: string; domain: string }[] | null;
    }>(() =>
      sup
        .from("listing_taxonomy_node")
        .select("listing_id, taxonomy_nodes:taxonomy_node_id(id, slug_path, domain)")
        .in("listing_id", ids)
        .order("listing_id", { ascending: true })
    ),
    selectAll<{ listing_id: string; profile_id: string | null }>(() =>
      sup.from("listing_team_members").select("listing_id, profile_id").in("listing_id", ids).order("listing_id", { ascending: true })
    ),
    selectAll<{ project_id: string; material_id: string }>(() =>
      sup.from("project_material_links").select("project_id, material_id").in("project_id", ids).order("project_id", { ascending: true })
    ),
    selectAll<{ product_id: string; material_id: string }>(() =>
      sup.from("product_material_links").select("product_id, material_id").in("product_id", ids).order("product_id", { ascending: true })
    ),
    selectAll<{ project_id: string; product_id: string }>(() =>
      sup.from("project_product_links").select("project_id, product_id").order("project_id", { ascending: true })
    ),
  ]);

  const taxPaths = new Map<string, string[]>();
  const taxNodeIds = new Map<string, string[]>();
  for (const r of taxRes) {
    const node = Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] : r.taxonomy_nodes;
    if (!node) continue;
    const paths = taxPaths.get(r.listing_id) ?? [];
    const nodes = taxNodeIds.get(r.listing_id) ?? [];
    if (node.slug_path) paths.push(node.slug_path);
    if (node.id) nodes.push(node.id);
    taxPaths.set(r.listing_id, paths);
    taxNodeIds.set(r.listing_id, nodes);
  }

  const credits = new Map<string, string[]>();
  for (const r of teamRes) {
    if (!r.profile_id) continue;
    const arr = credits.get(r.listing_id) ?? [];
    if (!arr.includes(r.profile_id)) arr.push(r.profile_id);
    credits.set(r.listing_id, arr);
  }

  const materials = new Map<string, string[]>();
  const addMat = (id: string, m: string) => {
    const arr = materials.get(id) ?? [];
    arr.push(m);
    materials.set(id, arr);
  };
  for (const r of projMatRes) addMat(r.project_id, r.material_id);
  for (const r of prodMatRes) addMat(r.product_id, r.material_id);

  // Connectedness counts both directions of project↔product.
  const connections = new Map<string, number>();
  for (const r of linkRes) {
    connections.set(r.project_id, (connections.get(r.project_id) ?? 0) + 1);
    connections.set(r.product_id, (connections.get(r.product_id) ?? 0) + 1);
  }

  return listings.map((l) => {
    const creditIds = [...(credits.get(l.id) ?? [])];
    // The owner is a credit too — a brand's own product is "from a brand you
    // follow" even when nobody added them to the team list.
    if (l.owner_profile_id && !creditIds.includes(l.owner_profile_id)) creditIds.push(l.owner_profile_id);
    return {
      id: l.id,
      type: l.type,
      slug: l.slug,
      title: l.title ?? "Untitled",
      createdAt: l.created_at,
      ownerProfileId: l.owner_profile_id,
      creditProfileIds: creditIds,
      taxonomyPaths: taxPaths.get(l.id) ?? [],
      taxonomyNodeIds: taxNodeIds.get(l.id) ?? [],
      materialIds: materials.get(l.id) ?? [],
      city: l.location_city,
      country: l.location_country,
      lat: l.location_lat,
      lng: l.location_lng,
      viewsCount: Number(l.views_count ?? 0),
      connectionCount: connections.get(l.id) ?? 0,
    };
  });
}

/** Cached for everyone — the pool is not viewer-specific. */
export function getCandidatePool(): Promise<Candidate[]> {
  return unstable_cache(buildCandidatePool, ["personalization-candidate-pool"], {
    revalidate: POOL_TTL_SECONDS,
    tags: ["personalization-pool"],
  })();
}
