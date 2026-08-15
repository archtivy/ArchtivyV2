/**
 * Data layer for the /products directory.
 *
 * Same shape and discipline as projectsDirectory.ts: rows plus facet
 * vocabularies derived FROM those rows, so a facet with no data cannot render.
 *
 * Measured against production 2026-08-03 (76 approved products):
 *   categories     11 with >=1 product, all 76 classified   -> rendered
 *   brands         15, via listings.owner_profile_id        -> rendered
 *   colors         15 values / 37 products (color-family)   -> rendered
 *   materials      15 values / 18 products                  -> rendered
 *   finish          4 values / 14 products                  -> rendered
 *   sustainability  2 values /  3 products                  -> rendered (sparse)
 *   location        0 products have any location            -> OMITTED
 *   certifications  no field; fsc-certified lives inside
 *                   the sustainability facet                -> OMITTED
 *
 * NOTE ON BRANDS: products.brand_profile_id is populated on 0 of 76 rows. The
 * real brand is listings.owner_profile_id, which resolves to a brand-role
 * profile on all 76. Reading brand_profile_id here would produce an empty
 * facet — and selecting it off `listings` errors outright (42703), because that
 * column lives on the products sidecar.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { FacetValue } from "@/components/directory/FilterPrimitives";

export interface DirectoryProduct {
  id: string;
  slug: string | null;
  title: string;
  href: string;
  cover: string | null;
  imageCount: number;
  brand: string | null;
  brandId: string | null;
  category: string | null;
  categoryLabel: string | null;
  typeLabel: string | null;
  colors: string[];
  materials: string[];
  finishes: string[];
  sustainability: string[];
  usedInProjects: number;
  createdAt: string;
}

export interface ProductFacets {
  categories: FacetValue[];
  brands: FacetValue[];
  colors: FacetValue[];
  materials: FacetValue[];
  finishes: FacetValue[];
  sustainability: FacetValue[];
  /** Real aggregates for the trust strip — no invented scale. */
  withDocuments: number;
  brandsWithWebsite: number;
}

export interface ProductsDirectoryData {
  products: DirectoryProduct[];
  facets: ProductFacets;
  total: number;
}

function titleize(slug: string): string {
  return slug
    .split(/[-/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tally(values: string[], labels?: Map<string, string>): FacetValue[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labels?.get(value) ?? titleize(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function fetchProductsDirectory(): Promise<ProductsDirectoryData> {
  const sup = getSupabaseServiceClient();

  const { data: rows } = await sup
    .from("listings")
    .select("id, slug, title, cover_image_url, created_at, owner_profile_id")
    .eq("type", "product")
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const listings = (rows ?? []) as Record<string, unknown>[];
  const empty: ProductsDirectoryData = {
    products: [],
    facets: {
      categories: [],
      brands: [],
      colors: [],
      materials: [],
      finishes: [],
      sustainability: [],
      withDocuments: 0,
      brandsWithWebsite: 0,
    },
    total: 0,
  };
  if (listings.length === 0) return empty;

  const ids = listings.map((l) => String(l.id));
  const ownerIds = Array.from(
    new Set(listings.map((l) => l.owner_profile_id).filter(Boolean) as string[])
  );

  const [imgRes, taxRes, facetRes, matLinkRes, usageRes, docRes, brandRes] = await Promise.all([
    sup.from("listing_images").select("listing_id").in("listing_id", ids),
    sup
      .from("listing_taxonomy_node")
      .select("listing_id, is_primary, taxonomy_nodes:taxonomy_node_id(domain, slug_path, label)")
      .in("listing_id", ids),
    sup
      .from("listing_facets")
      .select("listing_id, facet_values:facet_value_id(slug, label, facets:facet_id(slug))")
      .in("listing_id", ids),
    // No FK on product_material_links either — explicit two-step, same as projects.
    sup.from("product_material_links").select("product_id, material_id").in("product_id", ids),
    sup.from("project_product_links").select("product_id").in("product_id", ids),
    sup.from("listing_documents").select("listing_id").in("listing_id", ids),
    ownerIds.length > 0
      ? sup.from("profiles").select("id, display_name, website").in("id", ownerIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const imageCounts = new Map<string, number>();
  for (const r of (imgRes.data ?? []) as { listing_id: string }[]) {
    imageCounts.set(r.listing_id, (imageCounts.get(r.listing_id) ?? 0) + 1);
  }

  const usage = new Map<string, number>();
  for (const r of (usageRes.data ?? []) as { product_id: string }[]) {
    usage.set(r.product_id, (usage.get(r.product_id) ?? 0) + 1);
  }

  const docListings = new Set(
    ((docRes.data ?? []) as { listing_id: string }[]).map((r) => r.listing_id)
  );

  const brands = new Map<string, { name: string | null; website: string | null }>();
  for (const b of (brandRes.data ?? []) as {
    id: string;
    display_name: string | null;
    website: string | null;
  }[]) {
    brands.set(b.id, { name: b.display_name, website: b.website });
  }

  // Taxonomy: primary product node -> category root + type label.
  type TaxNode = { domain: string; slug_path: string; label: string };
  const catBy = new Map<string, { root: string; label: string; typeLabel: string }>();
  for (const r of (taxRes.data ?? []) as unknown as {
    listing_id: string;
    is_primary: boolean;
    taxonomy_nodes: TaxNode | TaxNode[] | null;
  }[]) {
    const n = one(r.taxonomy_nodes);
    if (!n || n.domain !== "product") continue;
    if (r.is_primary || !catBy.has(r.listing_id)) {
      catBy.set(r.listing_id, {
        root: n.slug_path.split("/")[0],
        label: titleize(n.slug_path.split("/")[0]),
        typeLabel: n.label,
      });
    }
  }

  // Facets: color-family / finish-texture / sustainability.
  const colorsBy = new Map<string, string[]>();
  const finishBy = new Map<string, string[]>();
  const sustBy = new Map<string, string[]>();
  const facetLabels = new Map<string, string>();
  for (const r of (facetRes.data ?? []) as unknown as {
    listing_id: string;
    facet_values:
      | { slug: string; label: string; facets: { slug: string } | { slug: string }[] | null }
      | { slug: string; label: string; facets: { slug: string } | { slug: string }[] | null }[]
      | null;
  }[]) {
    const fv = one(r.facet_values);
    if (!fv) continue;
    const f = one(fv.facets);
    if (!f) continue;
    facetLabels.set(fv.slug, fv.label);
    const target =
      f.slug === "color-family"
        ? colorsBy
        : f.slug === "finish-texture"
          ? finishBy
          : f.slug === "sustainability"
            ? sustBy
            : null;
    if (!target) continue;
    const list = target.get(r.listing_id) ?? [];
    list.push(fv.slug);
    target.set(r.listing_id, list);
  }

  // Materials, two-step.
  const matLinks = (matLinkRes.data ?? []) as { product_id: string; material_id: string }[];
  const materialNames = new Map<string, string>();
  const materialIds = Array.from(new Set(matLinks.map((r) => r.material_id).filter(Boolean)));
  if (materialIds.length > 0) {
    const { data: mats } = await sup.from("materials").select("id, name").in("id", materialIds);
    for (const m of (mats ?? []) as { id: string; name: string }[]) {
      materialNames.set(m.id, m.name);
    }
  }
  const materialsBy = new Map<string, string[]>();
  for (const r of matLinks) {
    const name = materialNames.get(r.material_id);
    if (!name) continue;
    const list = materialsBy.get(r.product_id) ?? [];
    list.push(name);
    materialsBy.set(r.product_id, list);
  }

  const products: DirectoryProduct[] = listings.map((l) => {
    const id = String(l.id);
    const ownerId = (l.owner_profile_id as string | null) ?? null;
    const brand = ownerId ? brands.get(ownerId) : undefined;
    const cat = catBy.get(id);
    const slug = (l.slug as string | null) ?? null;
    return {
      id,
      slug,
      title: String(l.title ?? "Untitled"),
      href: `/products/${slug ?? id}`,
      cover: (l.cover_image_url as string | null) ?? null,
      imageCount: imageCounts.get(id) ?? 0,
      brand: brand?.name ?? null,
      brandId: ownerId,
      category: cat?.root ?? null,
      categoryLabel: cat?.label ?? null,
      typeLabel: cat?.typeLabel ?? null,
      colors: colorsBy.get(id) ?? [],
      materials: materialsBy.get(id) ?? [],
      finishes: finishBy.get(id) ?? [],
      sustainability: sustBy.get(id) ?? [],
      usedInProjects: usage.get(id) ?? 0,
      createdAt: String(l.created_at),
    };
  });

  const brandLabels = new Map<string, string>();
  for (const [id, b] of brands) if (b.name) brandLabels.set(id, b.name);

  const facets: ProductFacets = {
    categories: tally(
      products.map((p) => p.category).filter(Boolean) as string[],
      new Map(products.filter((p) => p.category).map((p) => [p.category!, p.categoryLabel!]))
    ),
    brands: tally(products.map((p) => p.brandId).filter(Boolean) as string[], brandLabels),
    colors: tally(products.flatMap((p) => p.colors), facetLabels),
    materials: tally(products.flatMap((p) => p.materials)),
    finishes: tally(products.flatMap((p) => p.finishes), facetLabels),
    sustainability: tally(products.flatMap((p) => p.sustainability), facetLabels),
    withDocuments: products.filter((p) => docListings.has(p.id)).length,
    brandsWithWebsite: Array.from(
      new Set(
        products
          .map((p) => p.brandId)
          .filter((id): id is string => Boolean(id) && Boolean(brands.get(id!)?.website))
      )
    ).length,
  };

  return { products, facets, total: products.length };
}

export const getProductsDirectory = unstable_cache(
  fetchProductsDirectory,
  ["products:directory:v1"],
  { tags: [CACHE_TAGS.listings, CACHE_TAGS.profiles], revalidate: 3600 }
);
