/**
 * Inspiration feed repository (spec §2, §9.5).
 *
 * "Inspiration" is NOT an entity. This is an aggregation over the three real
 * sources the investigation confirmed:
 *
 *   listings WHERE type='project'   50 approved
 *   listings WHERE type='product'   76 approved
 *   materials                       92 rows
 *
 * `entityType` on every item carries which one it came from, so the frontend
 * routes to the correct canonical detail page and never invents an
 * /inspirations/{id} destination that has no record behind it.
 *
 * NOT IN v1 (spec §9.6), and why:
 *   Interiors / Exteriors   listing_images.shot_type exists after this
 *                           migration but is NULL on all 1,159 rows. The tabs
 *                           stay out until a reviewed backfill runs.
 *   Mood                    no facet, no taxonomy domain, nothing to query.
 *   Awards                  no backing entity anywhere.
 *
 * DISCOVERY LOOP HONESTY: hops are computed from CONFIRMED relationships only —
 * project_product_links (13 rows), listing_team_members, owner_profile_id,
 * *_material_links. The `matches` table (524 rows) holds embedding-derived
 * project→product SUGGESTIONS and is deliberately NOT read here: presenting a
 * guess as a stated relationship is the one thing "every card is a doorway"
 * must not do. It is the seed for the phase-2 review workflow, not a data source.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";

export const INSPIRATION_TABS = ["all", "projects", "products", "materials"] as const;
export type InspirationTab = (typeof INSPIRATION_TABS)[number];

export type InspirationEntityType = "project" | "product" | "material";

/** One hop out of a card. Only ever built from a relationship that exists. */
export interface DiscoveryHop {
  kind: "designer" | "brand" | "product" | "material" | "collection";
  label: string;
  href: string;
}

export interface InspirationItem {
  id: string;
  entityType: InspirationEntityType;
  title: string;
  href: string;
  cover: string | null;
  imageCount: number;
  /** Studio for a project, brand for a product, null for a material. */
  attribution: string | null;
  locationText: string | null;
  year: number | null;
  areaSqm: number | null;
  styleLabels: string[];
  spaceLabels: string[];
  elementLabels: string[];
  colorLabels: string[];
  categoryLabel: string | null;
  hops: DiscoveryHop[];
  createdAt: string;
}

export interface InspirationFacets {
  styles: FacetCount[];
  spaces: FacetCount[];
  elements: FacetCount[];
  colors: FacetCount[];
  categories: FacetCount[];
  yearRange: { min: number; max: number } | null;
  withProductsCount: number;
}

export interface FacetCount {
  value: string;
  label: string;
  count: number;
}

export interface InspirationQuery {
  q?: string;
  tab?: InspirationTab;
  style?: string[];
  space?: string[];
  element?: string[];
  color?: string[];
  category?: string[];
  city?: string[];
  yearMin?: number | null;
  yearMax?: number | null;
  hasProducts?: boolean;
  page?: number;
  perPage?: number;
}

export interface InspirationPage {
  items: InspirationItem[];
  facets: InspirationFacets;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  /** Set when zero results forced a filter to be relaxed (Search Bible §Zero-Result). */
  relaxed: { filter: string; value: string } | null;
}

const DEFAULT_PER_PAGE = 24;
const MAX_PER_PAGE = 60;
const UNDEFINED_TABLE = "42P01";

function titleize(slug: string): string {
  return slug
    .split(/[-/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

/* ────────────────────────────────────────────────────────────────────────────
 * The whole corpus is loaded once into a cached, in-memory shape and filtered
 * per request. 126 listings + 92 materials is small enough that this costs one
 * cached round trip instead of a query per filter combination, and it is the
 * only way facet COUNTS can be correct for the current filter set without N+1.
 * If the archive passes a few thousand items this must move to SQL.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Corpus {
  items: InspirationItem[];
  /** listingId -> confirmed product count, for the hasProducts filter. */
  productCounts: Map<string, number>;
}

/**
 * What actually crosses the unstable_cache boundary.
 *
 * A Map does NOT survive it — the cache serialises to JSON, so a Map comes back
 * as `{}` with no .get(), which fails at runtime and not at compile time
 * (TypeScript still believes the declared return type). Entry tuples are stored
 * instead and rehydrated on read.
 */
interface CachedCorpus {
  items: InspirationItem[];
  productCounts: [string, number][];
}

async function loadCorpus(): Promise<CachedCorpus> {
  const sup = getSupabaseServiceClient();

  const [listingsRes, imagesRes, taxRes, facetRes, teamRes, ppRes, matLinkRes, prodMatRes, materialsRes, profilesRes] =
    await Promise.all([
      sup
        .from("listings")
        .select(
          "id, type, slug, title, cover_image_url, location_city, location_country, year, area_sqm, owner_profile_id, created_at"
        )
        .in("type", ["project", "product"])
        .eq("status", "APPROVED")
        .is("deleted_at", null),
      sup.from("listing_images").select("listing_id"),
      sup
        .from("listing_taxonomy_node")
        .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path, label)"),
      sup
        .from("listing_facets")
        .select("listing_id, facet_values:facet_value_id(slug, label, facets:facet_id(slug))"),
      sup.from("listing_team_members").select("listing_id, profile_id, display_name, title"),
      sup.from("project_product_links").select("project_id, product_id"),
      sup.from("project_material_links").select("project_id, material_id"),
      sup.from("product_material_links").select("product_id, material_id"),
      sup.from("materials").select("id, name, slug"),
      sup
        .from("profiles")
        .select("id, display_name, username, role")
        .is("deleted_at", null)
        .not("username", "is", null),
    ]);

  if (listingsRes.error) {
    console.error("[inspirations] listings query failed:", listingsRes.error.message);
    return { items: [], productCounts: [] };
  }

  type ListingRow = {
    id: string;
    type: string;
    slug: string | null;
    title: string;
    cover_image_url: string | null;
    location_city: string | null;
    location_country: string | null;
    year: number | null;
    area_sqm: number | null;
    owner_profile_id: string | null;
    created_at: string;
  };
  const listings = (listingsRes.data ?? []) as ListingRow[];

  const imageCounts = new Map<string, number>();
  for (const r of (imagesRes.data ?? []) as { listing_id: string }[]) {
    imageCounts.set(r.listing_id, (imageCounts.get(r.listing_id) ?? 0) + 1);
  }

  const profiles = new Map<string, { name: string; username: string; role: string }>();
  for (const p of (profilesRes.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    role: string;
  }[]) {
    if (!p.username) continue;
    profiles.set(p.id, {
      name: p.display_name?.trim() || p.username,
      username: p.username,
      role: p.role,
    });
  }

  const materials = new Map<string, { name: string; slug: string | null }>();
  for (const m of (materialsRes.data ?? []) as { id: string; name: string; slug: string | null }[]) {
    materials.set(m.id, { name: m.name, slug: m.slug });
  }

  // Taxonomy: style / space_type domains for facets, project|product for category.
  const styleBy = new Map<string, string[]>();
  const spaceBy = new Map<string, string[]>();
  const catBy = new Map<string, string>();
  for (const r of (taxRes.data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: { domain: string; slug_path: string; label: string } | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n) continue;
    if (n.domain === "style") {
      styleBy.set(r.listing_id, [...(styleBy.get(r.listing_id) ?? []), n.label]);
    } else if (n.domain === "space_type") {
      spaceBy.set(r.listing_id, [...(spaceBy.get(r.listing_id) ?? []), n.label]);
    } else if ((n.domain === "project" || n.domain === "product") && (r.is_primary || !catBy.has(r.listing_id))) {
      catBy.set(r.listing_id, titleize(n.slug_path.split("/")[0]));
    }
  }

  // Facets: architectural-element (project) and color-family.
  const elementBy = new Map<string, string[]>();
  const colorBy = new Map<string, string[]>();
  for (const r of (facetRes.data ?? []) as unknown as {
    listing_id: string;
    facet_values: { slug: string; label: string; facets: { slug: string } | null } | null;
  }[]) {
    const fv = one(r.facet_values);
    if (!fv) continue;
    const f = one(fv.facets);
    if (!f) continue;
    if (f.slug === "architectural-element") {
      elementBy.set(r.listing_id, [...(elementBy.get(r.listing_id) ?? []), fv.label]);
    } else if (f.slug === "color-family") {
      colorBy.set(r.listing_id, [...(colorBy.get(r.listing_id) ?? []), fv.label]);
    }
  }

  // Confirmed relationships only.
  const productsOfProject = new Map<string, string[]>();
  const projectsOfProduct = new Map<string, string[]>();
  for (const r of (ppRes.data ?? []) as { project_id: string; product_id: string }[]) {
    productsOfProject.set(r.project_id, [...(productsOfProject.get(r.project_id) ?? []), r.product_id]);
    projectsOfProduct.set(r.product_id, [...(projectsOfProduct.get(r.product_id) ?? []), r.project_id]);
  }
  const materialsOf = new Map<string, string[]>();
  for (const r of (matLinkRes.data ?? []) as { project_id: string; material_id: string }[]) {
    materialsOf.set(r.project_id, [...(materialsOf.get(r.project_id) ?? []), r.material_id]);
  }
  for (const r of (prodMatRes.data ?? []) as { product_id: string; material_id: string }[]) {
    materialsOf.set(r.product_id, [...(materialsOf.get(r.product_id) ?? []), r.material_id]);
  }
  const teamOf = new Map<string, { profileId: string | null; name: string | null }[]>();
  for (const r of (teamRes.data ?? []) as {
    listing_id: string;
    profile_id: string | null;
    display_name: string | null;
  }[]) {
    teamOf.set(r.listing_id, [
      ...(teamOf.get(r.listing_id) ?? []),
      { profileId: r.profile_id, name: r.display_name },
    ]);
  }

  const listingById = new Map(listings.map((l) => [l.id, l]));

  const items: InspirationItem[] = listings.map((l) => {
    const isProject = l.type === "project";
    const owner = l.owner_profile_id ? profiles.get(l.owner_profile_id) : undefined;
    const segment = l.slug ?? l.id;

    /* Discovery Loop. Each hop is appended ONLY if the relationship exists for
       this specific card — an absent hop disappears rather than rendering as a
       dead control (spec §9.6). */
    const hops: DiscoveryHop[] = [];

    if (owner) {
      hops.push({
        kind: isProject ? "designer" : "brand",
        label: owner.name,
        href: `/u/${encodeURIComponent(owner.username)}`,
      });
    }
    if (isProject) {
      for (const t of teamOf.get(l.id) ?? []) {
        if (!t.profileId) continue;
        const p = profiles.get(t.profileId);
        if (!p || t.profileId === l.owner_profile_id) continue;
        if (hops.some((h) => h.href === `/u/${encodeURIComponent(p.username)}`)) continue;
        hops.push({ kind: "designer", label: p.name, href: `/u/${encodeURIComponent(p.username)}` });
        if (hops.length > 3) break;
      }
    }

    const linkedProducts = isProject ? productsOfProject.get(l.id) ?? [] : projectsOfProduct.get(l.id) ?? [];
    for (const otherId of linkedProducts.slice(0, 2)) {
      const other = listingById.get(otherId);
      if (!other) continue;
      hops.push({
        kind: "product",
        label: other.title,
        href: `/${other.type === "product" ? "products" : "projects"}/${other.slug ?? other.id}`,
      });
    }

    for (const mid of (materialsOf.get(l.id) ?? []).slice(0, 2)) {
      const m = materials.get(mid);
      if (!m) continue;
      hops.push({ kind: "material", label: m.name, href: `/explore/projects?q=${encodeURIComponent(m.name)}` });
    }

    return {
      id: l.id,
      entityType: isProject ? "project" : "product",
      title: l.title,
      href: `/${isProject ? "projects" : "products"}/${segment}`,
      cover: l.cover_image_url,
      imageCount: imageCounts.get(l.id) ?? 0,
      attribution: owner?.name ?? null,
      locationText: [l.location_city, l.location_country].filter(Boolean).join(", ") || null,
      year: l.year,
      areaSqm: l.area_sqm,
      styleLabels: styleBy.get(l.id) ?? [],
      spaceLabels: spaceBy.get(l.id) ?? [],
      elementLabels: elementBy.get(l.id) ?? [],
      colorLabels: colorBy.get(l.id) ?? [],
      categoryLabel: catBy.get(l.id) ?? null,
      hops,
      createdAt: l.created_at,
    };
  });

  /* Materials as feed items. They have no image of their own — the investigation
     found no material gallery — so a material card borrows the cover of a real
     listing that uses it. If nothing uses it, the card carries no image rather
     than a placeholder. */
  const listingsUsingMaterial = new Map<string, string[]>();
  for (const [listingId, mids] of materialsOf) {
    for (const mid of mids) {
      listingsUsingMaterial.set(mid, [...(listingsUsingMaterial.get(mid) ?? []), listingId]);
    }
  }
  for (const [id, m] of materials) {
    const users = listingsUsingMaterial.get(id) ?? [];
    if (users.length === 0) continue; // a material nothing uses is not an inspiration
    const withCover = users.map((lid) => listingById.get(lid)).find((l) => l?.cover_image_url);
    items.push({
      id,
      entityType: "material",
      title: m.name,
      href: `/explore/projects?q=${encodeURIComponent(m.name)}`,
      cover: withCover?.cover_image_url ?? null,
      imageCount: 0,
      attribution: null,
      locationText: null,
      year: null,
      areaSqm: null,
      styleLabels: [],
      spaceLabels: [],
      elementLabels: [],
      colorLabels: [],
      categoryLabel: "Material",
      hops: users
        .slice(0, 3)
        .map((lid) => listingById.get(lid))
        .filter((l): l is ListingRow => Boolean(l))
        .map((l) => ({
          kind: "product" as const,
          label: l.title,
          href: `/${l.type === "product" ? "products" : "projects"}/${l.slug ?? l.id}`,
        })),
      createdAt: new Date(0).toISOString(),
    });
  }

  const productCounts: [string, number][] = [...productsOfProject].map(([pid, list]) => [
    pid,
    list.length,
  ]);

  return { items, productCounts };
}

const getCachedCorpus = unstable_cache(loadCorpus, ["inspirations:corpus:v1"], {
  tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles, CACHE_TAGS.explore],
  revalidate: 3600,
});

/** Rebuilds the Map the cache cannot carry. */
async function getCorpus(): Promise<Corpus> {
  const cached = await getCachedCorpus();
  return {
    items: cached.items ?? [],
    productCounts: new Map(cached.productCounts ?? []),
  };
}

function tally(values: string[][], all: string[]): FacetCount[] {
  const counts = new Map<string, number>();
  for (const list of values) for (const v of new Set(list)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return all
    .map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function matches(item: InspirationItem, query: InspirationQuery, productCounts: Map<string, number>): boolean {
  const { q, tab, style, space, element, color, category, city, yearMin, yearMax, hasProducts } = query;

  if (tab && tab !== "all") {
    const want = tab === "projects" ? "project" : tab === "products" ? "product" : "material";
    if (item.entityType !== want) return false;
  }
  if (q) {
    const needle = q.toLowerCase();
    const hay = [
      item.title,
      item.attribution,
      item.locationText,
      item.categoryLabel,
      ...item.styleLabels,
      ...item.spaceLabels,
      ...item.elementLabels,
      ...item.colorLabels,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (style?.length && !item.styleLabels.some((s) => style.includes(s))) return false;
  if (space?.length && !item.spaceLabels.some((s) => space.includes(s))) return false;
  if (element?.length && !item.elementLabels.some((s) => element.includes(s))) return false;
  if (color?.length && !item.colorLabels.some((s) => color.includes(s))) return false;
  if (category?.length && !category.includes(item.categoryLabel ?? "")) return false;
  if (city?.length && !city.some((c) => item.locationText?.includes(c))) return false;
  if (yearMin != null && (item.year ?? -Infinity) < yearMin) return false;
  if (yearMax != null && (item.year ?? Infinity) > yearMax) return false;
  if (hasProducts && (productCounts.get(item.id) ?? 0) === 0) return false;
  return true;
}

/**
 * Zero-result recovery, step 1 of the Search Bible's order: drop the
 * LEAST-SELECTIVE active filter — the one whose removal recovers the most
 * results — and say which one was relaxed. Steps 2 and 3 (nearest collection,
 * adjacent taxonomy terms) are the caller's job; the collection suggestion is
 * wired in the page, since it needs the collections table.
 */
function relax(
  query: InspirationQuery,
  corpus: Corpus
): { query: InspirationQuery; relaxed: { filter: string; value: string } } | null {
  const listKeys = ["style", "space", "element", "color", "category", "city"] as const;
  let best: { key: string; value: string; next: InspirationQuery; count: number } | null = null;

  for (const key of listKeys) {
    const active = query[key];
    if (!active?.length) continue;
    for (const value of active) {
      const next: InspirationQuery = { ...query, [key]: active.filter((v) => v !== value) };
      const count = corpus.items.filter((i) => matches(i, next, corpus.productCounts)).length;
      if (count > 0 && (!best || count > best.count)) best = { key, value, next, count };
    }
  }
  if (!best && query.hasProducts) {
    const next = { ...query, hasProducts: false };
    if (corpus.items.filter((i) => matches(i, next, corpus.productCounts)).length > 0) {
      return { query: next, relaxed: { filter: "hasProducts", value: "Projects with products" } };
    }
  }
  if (!best) return null;
  return { query: best.next, relaxed: { filter: best.key, value: best.value } };
}

export async function getInspirations(query: InspirationQuery): Promise<InspirationPage> {
  let corpus: Corpus;
  try {
    corpus = await getCorpus();
  } catch (err) {
    console.error("[inspirations] corpus load failed:", err);
    corpus = { items: [], productCounts: new Map() };
  }

  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, query.perPage ?? DEFAULT_PER_PAGE));
  const page = Math.max(1, query.page ?? 1);

  let effective = query;
  let relaxed: InspirationPage["relaxed"] = null;
  let filtered = corpus.items.filter((i) => matches(i, effective, corpus.productCounts));

  if (filtered.length === 0) {
    const recovery = relax(query, corpus);
    if (recovery) {
      effective = recovery.query;
      relaxed = recovery.relaxed;
      filtered = corpus.items.filter((i) => matches(i, effective, corpus.productCounts));
    }
  }

  // Ranking, in the Search Bible's stated order and no further: relevance is
  // already binary here (the item matched), so what remains is information
  // quality (has a cover, has images) then relationship density (hop count)
  // then freshness. No engagement signal exists — listing_views is empty — so
  // none is invented.
  const ranked = [...filtered].sort((a, b) => {
    const quality = (i: InspirationItem) => (i.cover ? 2 : 0) + (i.imageCount > 1 ? 1 : 0);
    return (
      quality(b) - quality(a) ||
      b.hops.length - a.hops.length ||
      b.createdAt.localeCompare(a.createdAt) ||
      a.title.localeCompare(b.title)
    );
  });

  // Facet counts are computed over the tab-and-query-filtered set, so a facet
  // value that would return zero is never offered (Search Bible: don't lead
  // users into zero-result combinations blind).
  const scope = corpus.items.filter((i) =>
    matches(i, { tab: effective.tab, q: effective.q }, corpus.productCounts)
  );
  const allOf = (pick: (i: InspirationItem) => string[]) =>
    [...new Set(scope.flatMap(pick))].sort();

  const years = scope.map((i) => i.year).filter((y): y is number => typeof y === "number");

  const facets: InspirationFacets = {
    styles: tally(scope.map((i) => i.styleLabels), allOf((i) => i.styleLabels)),
    spaces: tally(scope.map((i) => i.spaceLabels), allOf((i) => i.spaceLabels)),
    elements: tally(scope.map((i) => i.elementLabels), allOf((i) => i.elementLabels)),
    colors: tally(scope.map((i) => i.colorLabels), allOf((i) => i.colorLabels)),
    categories: tally(
      scope.map((i) => (i.categoryLabel ? [i.categoryLabel] : [])),
      [...new Set(scope.map((i) => i.categoryLabel).filter((c): c is string => Boolean(c)))].sort()
    ),
    yearRange: years.length ? { min: Math.min(...years), max: Math.max(...years) } : null,
    withProductsCount: scope.filter((i) => (corpus.productCounts.get(i.id) ?? 0) > 0).length,
  };

  const total = ranked.length;
  const start = (page - 1) * perPage;

  return {
    items: ranked.slice(start, start + perPage),
    facets,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    relaxed,
  };
}

/**
 * "Similar Inspirations" — description-based similarity, NOT image-to-image.
 *
 * image_ai.embedding holds text embeddings of AI-generated alt text
 * (text-embedding-3-small), so this finds items whose DESCRIPTIONS are close,
 * not items that look alike. Every caller must label it accordingly; the copy
 * in the UI says "Similar by description" for exactly this reason.
 *
 * Uses match_listing_images_by_embedding, added in the 20260807 migration —
 * the pre-existing match_product_images_by_embedding returns product_id only
 * and cannot serve project cards.
 */
export async function getSimilarInspirations(
  listingId: string,
  listingType: "project" | "product",
  limit = 6
): Promise<InspirationItem[]> {
  const sup = getSupabaseServiceClient();

  const { data: seed, error: seedErr } = await sup
    .from("image_ai")
    .select("embedding")
    .eq("listing_id", listingId)
    .not("embedding", "is", null)
    .limit(1)
    .maybeSingle();

  if (seedErr || !seed?.embedding) return [];

  const { data, error } = await sup.rpc("match_listing_images_by_embedding", {
    query_embedding: seed.embedding,
    match_count: Math.min(60, limit * 8),
    filter_listing_type: listingType,
    exclude_listing_id: listingId,
  });

  if (error) {
    if (error.code !== UNDEFINED_TABLE && error.code !== "42883") {
      console.error("[inspirations] similar RPC failed:", error.message);
    }
    return [];
  }

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of (data ?? []) as { listing_id: string }[]) {
    if (seen.has(r.listing_id)) continue;
    seen.add(r.listing_id);
    ordered.push(r.listing_id);
    if (ordered.length >= limit) break;
  }
  if (ordered.length === 0) return [];

  const { items } = await getCorpus();
  const byId = new Map(items.map((i) => [i.id, i]));
  return ordered.map((id) => byId.get(id)).filter((i): i is InspirationItem => Boolean(i));
}

/**
 * Hydrate specific ids straight from the corpus, bypassing pagination.
 *
 * Collections need this: fetchCollection() previously hydrated its members via
 * getInspirations({ perPage: 200 }), but perPage is clamped to MAX_PER_PAGE
 * (60), so a collection whose members fell outside the first 60 ranked items
 * silently rendered a fraction of itself — 2 of 17 in the first real seed.
 * Nothing errored; the page just looked sparse.
 *
 * Returns items in the order the ids are given, so the caller's sort_order wins.
 */
export async function getInspirationItemsByIds(ids: string[]): Promise<InspirationItem[]> {
  if (ids.length === 0) return [];
  const { items } = await getCorpus();
  const byId = new Map(items.map((i) => [i.id, i]));
  return ids.map((id) => byId.get(id)).filter((i): i is InspirationItem => Boolean(i));
}

/**
 * Every item matching a query, unpaginated — for the collections job only.
 *
 * getInspirations() clamps perPage to MAX_PER_PAGE (60) because it backs an
 * HTTP endpoint, where an unbounded page is a denial-of-service shape. The
 * daily materialisation has the opposite requirement: it must see the whole
 * match set, or a collection with more than 60 members would be silently
 * truncated to 60 every night with nothing reporting it.
 *
 * Deliberately returns ids, not items: the job only writes listing ids into
 * collection_items, and hydrating 60+ full items to discard them is waste.
 */
export async function getMatchingInspirationIds(query: InspirationQuery): Promise<string[]> {
  const corpus = await getCorpus();
  return corpus.items
    .filter((i) => matches(i, query, corpus.productCounts))
    .filter((i) => i.entityType !== "material")
    .map((i) => i.id);
}
