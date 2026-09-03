/**
 * Brands Index data layer.
 *
 * MEASURED AGAINST PRODUCTION (2026-08-04):
 *
 *   role='brand' rows                                              49
 *     - no username (auto-created stubs)                           31  EXCLUDED
 *     - is_hidden                                                   1  EXCLUDED
 *     - deleted_at set                                              1  EXCLUDED  (dogru-joe)
 *     = listable                                                   17
 *
 *   FACETS
 *   category       11 values, all 76 products classified;
 *                  Furniture 7 brands, Walls Ceilings Facades 3,
 *                  Lighting 2, then 8 single-brand values          -> BUILT
 *   brand type     17/17 POPULATED — Manufacturer 10, Furniture
 *                  Brand 4, Material Brand 2, Artisan / Maker 1.
 *                  (The field Designers lacked entirely.)          -> BUILT
 *   origin         15/17 have a country, 12 distinct               -> BUILT
 *   sustainability only 2 brands (Lunawood, Barausse) via 3
 *                  products. A filter here would imply the other
 *                  15 are not sustainable, which the data does
 *                  not say                                         -> OMITTED
 *   project count  4 of 17 brands have a product used in a
 *                  project (Molteni&C 3; De Sede, Bonnet Studio,
 *                  Zanotta 1 each). Too narrow for a range, so a
 *                  single checkbox, as on Designers                -> BUILT (reduced)
 *
 *   CARD IMAGE  tile = a real cover from one of the brand's own products;
 *               logo = EntityCard's existing avatar badge. Same mapping as
 *               Designers (project cover + designer avatar), which is why
 *               EntityCard needs no new props. 14/17 have a logo, 15/17 have a
 *               product cover, 2 have neither (Drusch Design, Line Design —
 *               both zero products) and render on the flat stone block.
 *
 *   BRAND LINK  listings.owner_profile_id, NOT products.brand_profile_id —
 *               that column is populated on 0 of 76 rows. Same finding already
 *               recorded in productsDirectory.ts.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getProductsDirectory } from "@/lib/db/productsDirectory";
import type { FacetValue } from "@/components/directory/FilterPrimitives";
import { renderableImageUrl } from "@/lib/images/remoteAllowed";

export interface DirectoryBrand {
  id: string;
  href: string;
  name: string;
  /** Raw brand_type — doubles as the Brand Type filter value. */
  brandType: string | null;
  city: string | null;
  country: string | null;
  locationText: string | null;
  /** avatar_url. Rendered as EntityCard's avatar badge, never as the tile. */
  logoUrl: string | null;
  /** Cover of one of this brand's own products. Null for the 2 with none. */
  cover: string | null;
  categories: string[];
  productCount: number;
  /** Distinct projects using any of this brand's products. */
  projectCount: number;
  website: string | null;
  createdAt: string;
}

export interface BrandFacets {
  categories: FacetValue[];
  brandTypes: FacetValue[];
  countries: FacetValue[];
  withProjectsCount: number;
}

export interface BrandsDirectory {
  brands: DirectoryBrand[];
  facets: BrandFacets;
  total: number;
}

type BrandRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  brand_type: string | null;
  location_city: string | null;
  location_country: string | null;
  avatar_url: string | null;
  website: string | null;
  created_at: string;
};

const EMPTY: BrandsDirectory = {
  brands: [],
  facets: { categories: [], brandTypes: [], countries: [], withProjectsCount: 0 },
  total: 0,
};

function byCountDesc(a: FacetValue, b: FacetValue) {
  return b.count - a.count || a.label.localeCompare(b.label);
}

async function fetchBrandsDirectory(): Promise<BrandsDirectory> {
  const sup = getSupabaseServiceClient();

  const { data: brandData, error: brandErr } = await sup
    .from("profiles")
    .select(
      "id, username, display_name, brand_type, location_city, location_country, avatar_url, website, created_at"
    )
    .eq("role", "brand")
    .eq("is_hidden", false)
    .is("deleted_at", null)
    .not("username", "is", null);

  if (brandErr) {
    console.error("[brandsDirectory] profiles query failed:", brandErr.message);
    return EMPTY;
  }

  const rows = (brandData ?? []) as BrandRow[];
  if (rows.length === 0) return EMPTY;

  // Products come from the Products Index layer rather than a second query of
  // our own, so brand categories and the directory's category facet can never
  // disagree — one taxonomy resolution, one definition of "category".
  const { products } = await getProductsDirectory();

  const productsByBrand = new Map<string, typeof products>();
  for (const p of products) {
    if (!p.brandId) continue;
    if (!productsByBrand.has(p.brandId)) productsByBrand.set(p.brandId, []);
    productsByBrand.get(p.brandId)!.push(p);
  }

  /*
   * DirectoryProduct.usedInProjects is a count of link rows per product, which
   * cannot be summed across a brand without double-counting a project that uses
   * two of its products. So the project ids are pulled directly and de-duped.
   */
  const productIds = products.map((p) => p.id);
  const projectsByBrand = new Map<string, Set<string>>();
  if (productIds.length > 0) {
    const { data: linkData, error: linkErr } = await sup
      .from("project_product_links")
      .select("project_id, product_id")
      .in("product_id", productIds);

    if (linkErr) {
      console.error("[brandsDirectory] project_product_links failed:", linkErr.message);
    }

    const brandOfProduct = new Map(products.map((p) => [p.id, p.brandId]));
    for (const l of (linkData ?? []) as { project_id: string; product_id: string }[]) {
      const bid = brandOfProduct.get(l.product_id);
      if (!bid) continue;
      if (!projectsByBrand.has(bid)) projectsByBrand.set(bid, new Set());
      projectsByBrand.get(bid)!.add(l.project_id);
    }
  }

  const brands: DirectoryBrand[] = rows
    .filter((b): b is BrandRow & { username: string } => Boolean(b.username))
    .map((b) => {
      const own = productsByBrand.get(b.id) ?? [];
      const withCover = own.find((p) => p.cover);
      const categories = Array.from(
        new Set(own.map((p) => p.categoryLabel).filter((c): c is string => Boolean(c)))
      ).sort();

      return {
        id: b.id,
        href: `/u/${encodeURIComponent(b.username)}`,
        name: b.display_name?.trim() || b.username,
        brandType: b.brand_type,
        city: b.location_city,
        country: b.location_country,
        locationText:
          [b.location_city, b.location_country].filter(Boolean).join(", ") || null,
        // Same guard as the designers directory: one bad host anywhere in
        // the grid is a 500 for the whole page, not a missing logo.
        logoUrl: renderableImageUrl(b.avatar_url),
        cover: renderableImageUrl(withCover?.cover),
        categories,
        productCount: own.length,
        projectCount: projectsByBrand.get(b.id)?.size ?? 0,
        website: b.website,
        createdAt: b.created_at,
      };
    })
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name));

  const categoryCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  for (const b of brands) {
    for (const c of b.categories) categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
    if (b.brandType) typeCounts.set(b.brandType, (typeCounts.get(b.brandType) ?? 0) + 1);
    if (b.country) countryCounts.set(b.country, (countryCounts.get(b.country) ?? 0) + 1);
  }

  const toFacet = (m: Map<string, number>) =>
    [...m.entries()].map(([value, count]) => ({ value, label: value, count })).sort(byCountDesc);

  return {
    brands,
    total: brands.length,
    facets: {
      categories: toFacet(categoryCounts),
      brandTypes: toFacet(typeCounts),
      countries: toFacet(countryCounts),
      withProjectsCount: brands.filter((b) => b.projectCount > 0).length,
    },
  };
}

export const getBrandsDirectory = unstable_cache(
  fetchBrandsDirectory,
  ["brands:directory:v1"],
  { tags: [CACHE_TAGS.profiles, CACHE_TAGS.listings], revalidate: 3600 }
);
