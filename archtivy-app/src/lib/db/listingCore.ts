import { cache } from "react";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { sanitizeListingImageUrl } from "@/lib/db/listingImages";

/**
 * The small set of rows that BOTH the canonical lookup and the detail loader
 * need for the same listing, fetched once per request.
 *
 * ── THE DUPLICATION THIS CLOSES ─────────────────────────────────────────────
 * Rendering one project detail page runs two independent loaders over the same
 * listing: `getProjectCanonicalBySlugOrId`, which the route needs to resolve
 * the canonical URL and build metadata, and `getProjectDetail`, which the view
 * needs to draw the page. Measured, they were asking the database for the same
 * things twice — the gallery images, the material links, the materials behind
 * them, and the listing's taxonomy nodes — because each had grown its own
 * inline query with its own select list.
 *
 * Both now call the helpers below. `cache` from React memoises on the argument
 * for the lifetime of a single server render, so the second caller gets the
 * first caller's rows with no round trip at all.
 *
 * ── WHY NOT unstable_cache ──────────────────────────────────────────────────
 * Because this is deduplication, not caching. The memo dies with the request,
 * so an edit is visible on the very next page view exactly as it is today, and
 * nothing here changes how long anything is considered fresh. The existing
 * `unstable_cache` wrappers around the two loaders keep doing that job
 * untouched.
 *
 * ── WHY THE SELECTS ARE UNIONS, AND ONLY LOCALLY ────────────────────────────
 * Where the two callers wanted different columns the select here is the union
 * of exactly those, written out and commented. No select shared with the
 * directories, the explore layer or the card hydrators is touched: those keep
 * their own narrower queries, so nothing outside a detail page pays for a
 * column it does not read.
 *
 * ── KEYED ON A STRING, DELIBERATELY ─────────────────────────────────────────
 * Every helper takes one listing id rather than an array. React's `cache`
 * compares arguments by identity, so an array literal built at the call site
 * is a fresh reference every time and would never hit. The batch helpers that
 * genuinely take many ids are left alone for the many-id callers.
 */

export interface CoreImageRow {
  /** Needed by the detail loader to hang product hotspots off a real row. */
  id: string;
  /** Needed by the canonical normaliser, which groups by listing. */
  listing_id: string;
  image_url: string;
  alt: string | null;
  /** Non-null in practice and typed so by ListingImageRow; the column has a
      default, so a row without one cannot reach here. */
  sort_order: number;
}

/**
 * Deliberately the same shape as MaterialRow / MaterialTag (`display_name`,
 * non-null `slug`), so the canonical normaliser takes it unchanged. `name` is
 * carried alongside because the detail loader reads the raw column name.
 */
export interface CoreMaterial {
  id: string;
  display_name: string;
  name: string;
  slug: string;
}

export interface CoreTaxonomyRow {
  is_primary: boolean;
  /** `id` is the product detail loader's addition — it compares node ids
      rather than labels when deciding what a product's root type is. */
  node: { id: string; domain: string; slug_path: string; label: string } | null;
}

/**
 * Gallery images for one listing, ordered.
 *
 * Union select: `listing_id, image_url, alt, sort_order` is what the canonical
 * normaliser reads; `id` is the one column the detail loader adds, because a
 * hotspot pin is keyed by listing_images.id.
 *
 * The URL filter matches getImagesByListingIds exactly — a row whose url does
 * not sanitise is dropped rather than rendered as a broken frame.
 */
export const getCoreListingImages = cache(
  async (listingId: string): Promise<CoreImageRow[]> => {
    const sup = getSupabaseServiceClient();
    const { data, error } = await sup
      .from("listing_images")
      .select("id, listing_id, image_url, alt, sort_order")
      .eq("listing_id", listingId)
      .order("sort_order", { ascending: true });
    if (error) return [];
    return ((data ?? []) as CoreImageRow[]).filter(
      (r) => sanitizeListingImageUrl(r.image_url) != null
    );
  }
);

/** Materials attached to a project, via the link table. */
export const getCoreProjectMaterials = cache(
  async (listingId: string): Promise<CoreMaterial[]> =>
    materialsVia("project_material_links", "project_id", listingId)
);

/** Materials attached to a product, via its own link table. */
export const getCoreProductMaterials = cache(
  async (listingId: string): Promise<CoreMaterial[]> =>
    materialsVia("product_material_links", "product_id", listingId)
);

/**
 * Two steps rather than an embed, matching materials.ts: neither link table
 * carries a foreign key PostgREST can traverse, so the join has to be done
 * here. Both steps are inside one memo, so the pair costs at most once.
 */
async function materialsVia(
  table: "project_material_links" | "product_material_links",
  column: "project_id" | "product_id",
  listingId: string
): Promise<CoreMaterial[]> {
  const sup = getSupabaseServiceClient();
  const { data: links, error } = await sup
    .from(table)
    .select(`${column}, material_id`)
    .eq(column, listingId);
  if (error) return [];

  const ids = Array.from(
    new Set(
      ((links ?? []) as { material_id: string | null }[])
        .map((r) => r.material_id)
        .filter(Boolean) as string[]
    )
  );
  if (ids.length === 0) return [];

  const { data: mats, error: matErr } = await sup
    .from("materials")
    .select("id, name, slug")
    .in("id", ids);
  if (matErr) return [];
  return ((mats ?? []) as { id: string; name: string | null; slug: string | null }[])
    .filter((m) => m.name)
    .map((m) => ({
      id: m.id,
      display_name: m.name as string,
      name: m.name as string,
      slug: m.slug ?? "",
    }));
}

/**
 * Every taxonomy node attached to one listing.
 *
 * Fetched unfiltered and narrowed in memory, which is the one behavioural
 * detail worth stating: the canonical path used to ask the database for
 * `is_primary = true` only. Asking for all of a listing's nodes returns a
 * handful of rows for the same single round trip and lets the detail loader —
 * which needs the non-primary style node too — share the result instead of
 * issuing its own near-identical query.
 */
export const getCoreTaxonomyRows = cache(
  async (listingId: string): Promise<CoreTaxonomyRow[]> => {
    const sup = getSupabaseServiceClient();
    const { data, error } = await sup
      .from("listing_taxonomy_node")
      .select("is_primary, taxonomy_nodes:taxonomy_node_id(id, domain, slug_path, label)")
      .eq("listing_id", listingId);
    if (error) return [];
    type Node = { id: string; domain: string; slug_path: string; label: string };
    return ((data ?? []) as unknown as {
      is_primary: boolean | null;
      taxonomy_nodes: Node | Node[] | null;
    }[]).map((r) => ({
      is_primary: Boolean(r.is_primary),
      node: Array.isArray(r.taxonomy_nodes) ? r.taxonomy_nodes[0] ?? null : r.taxonomy_nodes,
    }));
  }
);

/**
 * Root labels for a set of taxonomy slug paths.
 *
 * Split out and memoised separately because the canonical fetcher needs it and
 * the detail loader does not — keeping it here means the two never race to ask
 * for the same roots twice on a page that renders both.
 */
export const getCoreTaxonomyRootLabels = cache(
  async (rootPathsKey: string): Promise<Map<string, string>> => {
    const rootPaths = rootPathsKey.split("|").filter(Boolean);
    const out = new Map<string, string>();
    if (rootPaths.length === 0) return out;
    const sup = getSupabaseServiceClient();
    const { data } = await sup
      .from("taxonomy_nodes")
      .select("slug_path, label")
      .in("slug_path", rootPaths);
    for (const r of (data ?? []) as { slug_path: string; label: string }[]) {
      out.set(r.slug_path, r.label);
    }
    return out;
  }
);
