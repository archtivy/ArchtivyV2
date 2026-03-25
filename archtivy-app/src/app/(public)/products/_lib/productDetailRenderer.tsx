/**
 * Shared product detail renderer.
 * Handles all data loading + JSX for the product detail page.
 * Called by the catch-all route after URL validation/redirects are resolved.
 */

import Link from "next/link";
import { getAbsoluteUrl, getListingUrl } from "@/lib/canonical";
import { getProductsCanonicalFiltered } from "@/lib/db/explore";
import { getProjectsForProduct } from "@/lib/db/projectProductLinks";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfileById } from "@/lib/db/profiles";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getOtherProductsByBrand } from "@/lib/db/networkDiscovery";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProductDetailLayout } from "@/components/listing/ProductDetailLayout";
import { DEFAULT_PRODUCT_FILTERS } from "@/lib/exploreFilters";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { GalleryImage } from "@/lib/db/gallery";
import {
  buildProductJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import {
  buildProductSeoTitle,
  buildProductMetaDescription,
  generateProductFaq,
  extractMaterialNames,
  extractBrandName,
  type ProductSeoInput,
} from "@/lib/seo/seo-templates";
import { JsonLd } from "@/components/seo/JsonLd";
import { getListingTaxonomyNodes, getListingFacets, getTaxonomyAncestors } from "@/lib/taxonomy/taxonomyDb";
import type { TaxonomyCrumb, TaxonomyMaterialTag, TaxonomyFacetGroup } from "@/components/listing/TaxonomyTags";

function canonicalGalleryToGalleryImages(
  gallery: { url: string; alt: string }[]
): GalleryImage[] {
  return gallery.map((img, i) => ({
    id: String(i),
    src: img.url,
    alt: img.alt || "Image",
    sort_order: i,
  }));
}

/**
 * Build SEO metadata for a product detail page.
 */
export function buildProductDetailMetadata(
  product: ProductCanonical,
  canonicalPath: string
) {
  const canonical = getAbsoluteUrl(canonicalPath);

  const brandName =
    extractBrandName((product as unknown as Record<string, unknown>).brands_used) ??
    extractBrandName((product as unknown as Record<string, unknown>).brand);

  const seoInput: ProductSeoInput = {
    title: product.title?.trim() || "Product",
    slug: product.slug ?? product.id,
    brand: brandName,
    product_type:
      ((product as unknown as Record<string, unknown>).product_type as string | null | undefined) ??
      (product.product_category ?? product.category ?? null),
    category: (product.product_category ?? product.category ?? null),
    materials: extractMaterialNames(
      (product as unknown as Record<string, unknown>).materials
    ),
    color_options: Array.isArray(
      (product as unknown as Record<string, unknown>).color_options
    )
      ? ((product as unknown as Record<string, unknown>).color_options as string[]).filter(
          (c) => typeof c === "string"
        )
      : [],
    description:
      typeof product.description === "string" ? product.description.trim() : null,
    gallery: product.gallery ?? [],
  };

  const seoTitle = buildProductSeoTitle(seoInput);
  const metaDescription = buildProductMetaDescription(seoInput);
  const imageUrl = product.cover
    ? product.cover.startsWith("http")
      ? product.cover
      : getAbsoluteUrl(product.cover)
    : undefined;

  return {
    title: seoTitle,
    description: metaDescription,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article" as const,
      title: seoTitle,
      description: metaDescription,
      url: canonical,
      siteName: "Archtivy",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: seoInput.title }],
      }),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: seoTitle,
      description: metaDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

/**
 * Async Server Component that loads all data and renders the product detail page.
 */
export async function ProductDetailRenderer({
  product,
  canonicalPath,
  taxonomySlugPath,
}: {
  product: ProductCanonical;
  canonicalPath: string;
  /** Taxonomy slug path from URL segments (e.g. "furniture/seating/lounge-chair"). Used as fallback for breadcrumbs. */
  taxonomySlugPath?: string | null;
}) {
  const [relatedResult, isSaved, brandResult, teamResult, docsResult, taxNodesResult, facetsResult, brandOtherProductsResult] = await Promise.all([
    getProjectsForProduct(product.id),
    getGalleryBookmarkState("product", product.id),
    product.brand_profile_id ? getProfileById(product.brand_profile_id) : Promise.resolve({ data: null, error: null }),
    getListingTeamMembersWithProfiles(product.id),
    getListingDocumentsServer(product.id),
    getListingTaxonomyNodes(product.id),
    getListingFacets(product.id),
    product.brand_profile_id
      ? getOtherProductsByBrand(product.brand_profile_id, product.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Process taxonomy data for sidebar tags
  const taxNodes = taxNodesResult.data ?? [];
  const primaryNode = taxNodes.find((n) => n.is_primary) ?? null;
  const materialTaxNodes: TaxonomyMaterialTag[] = taxNodes
    .filter((n) => !n.is_primary && n.domain === "material")
    .map((n) => ({ label: n.label, slug_path: n.slug_path }));
  const facetValues = facetsResult.data ?? [];
  const facetGroupMap = new Map<string, TaxonomyFacetGroup>();
  for (const fv of facetValues) {
    let group = facetGroupMap.get(fv.facet_slug);
    if (!group) {
      group = { facet_label: fv.facet_label, facet_slug: fv.facet_slug, values: [] };
      facetGroupMap.set(fv.facet_slug, group);
    }
    group.values.push({ label: fv.value_label, slug: fv.value_slug });
  }
  const taxonomyFacetGroups = Array.from(facetGroupMap.values());
  let categoryCrumbs: TaxonomyCrumb[] = [];
  console.log("[ProductDetail] taxNodes count:", taxNodes.length, "primaryNode:", primaryNode ? { domain: primaryNode.domain, slug_path: primaryNode.slug_path, is_primary: primaryNode.is_primary } : null, "taxonomySlugPath prop:", taxonomySlugPath);
  if (primaryNode) {
    const ancestorsRes = await getTaxonomyAncestors(primaryNode.domain, primaryNode.slug_path);
    categoryCrumbs = (ancestorsRes.data ?? []).map((n) => ({ label: n.label, slug_path: n.slug_path }));
    console.log("[ProductDetail] breadcrumbs from primaryNode:", primaryNode.slug_path, "→", categoryCrumbs.length, "crumbs:", categoryCrumbs.map(c => c.label), "error:", ancestorsRes.error);
  } else if (taxonomySlugPath) {
    const ancestorsRes = await getTaxonomyAncestors("product", taxonomySlugPath);
    categoryCrumbs = (ancestorsRes.data ?? []).map((n) => ({ label: n.label, slug_path: n.slug_path }));
    console.log("[ProductDetail] breadcrumbs from URL fallback:", taxonomySlugPath, "→", categoryCrumbs.length, "crumbs:", categoryCrumbs.map(c => c.label), "error:", ancestorsRes.error);
  } else {
    console.log("[ProductDetail] NO breadcrumbs: primaryNode=null, taxonomySlugPath=null");
  }

  const relatedListings = relatedResult.data ?? [];
  const projectIds = relatedListings.map((p) => p.id);
  const thumbnailMap =
    projectIds.length > 0
      ? (await getFirstImageUrlPerListingIds(projectIds)).data ?? {}
      : {};

  // Prefer taxonomy-based category resolution; fall back to legacy field
  const taxonomySlugForCategory = primaryNode?.slug_path ?? null;
  const legacyProductCategory = (product.product_category ?? product.category)?.trim() ?? "";

  const categoryFilter = taxonomySlugForCategory
    ? { ...DEFAULT_PRODUCT_FILTERS, taxonomy: taxonomySlugForCategory }
    : legacyProductCategory
      ? { ...DEFAULT_PRODUCT_FILTERS, product_category: legacyProductCategory }
      : null;

  const sameCategoryProducts: { id: string; slug: string; title: string; thumbnail?: string | null }[] = categoryFilter
    ? ((await getProductsCanonicalFiltered({
        filters: categoryFilter,
        limit: 7,
        sort: "newest",
      })).data ?? [])
        .filter((p) => p.id !== product.id)
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          slug: p.slug ?? p.id,
          title: p.title,
          thumbnail: p.cover ?? null,
        }))
    : [];

  const relatedProducts =
    relatedListings.length === 0 ? sameCategoryProducts : [];
  const moreInCategory = sameCategoryProducts;

  const relatedItems = relatedListings.map((p) => {
    const row = p as { id: string; slug?: string; title: string };
    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      subtitle: null as string | null,
      thumbnail: thumbnailMap[row.id],
    };
  });

  const brandProfile = brandResult.data as { display_name?: string; username?: string; avatar_url?: string } | null;
  const brandName = brandProfile?.display_name?.trim() || brandProfile?.username?.trim() || null;
  const brandHref =
    brandProfile?.username
      ? `/u/${brandProfile.username}`
      : product.brand_profile_id
        ? `/u/id/${product.brand_profile_id}`
        : null;
  const brandLogoUrl = brandProfile?.avatar_url?.trim() ?? null;
  const teamWithProfiles = teamResult.data ?? null;

  const images = canonicalGalleryToGalleryImages(product.gallery);
  const currentPath = canonicalPath;
  const listingDocuments = docsResult.data ?? [];

  const relatedListingsForLayout = relatedListings.map((p) => {
    const row = p as { id: string; slug?: string; title: string; location?: string | null };
    return { id: row.id, slug: row.slug, title: row.title, location: row.location ?? null };
  });

  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const mainJsonLd = buildProductJsonLd(product, brandName, brandHref, canonicalUrl);

  const seoInputForPage: ProductSeoInput = {
    title: product.title?.trim() || "Product",
    slug: product.slug ?? product.id,
    brand: brandName,
    product_type:
      ((product as unknown as Record<string, unknown>).product_type as string | null | undefined) ??
      (product.product_category ?? product.category ?? null),
    category: (product.product_category ?? product.category ?? null),
    materials: extractMaterialNames(
      (product as unknown as Record<string, unknown>).materials
    ),
    color_options: Array.isArray(
      (product as unknown as Record<string, unknown>).color_options
    )
      ? ((product as unknown as Record<string, unknown>).color_options as string[]).filter(
          (c) => typeof c === "string"
        )
      : [],
    description:
      typeof product.description === "string" ? product.description.trim() : null,
    gallery: product.gallery ?? [],
  };

  const faqJsonLd = buildFaqJsonLd(generateProductFaq(seoInputForPage));
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: getAbsoluteUrl("/products") },
    ...categoryCrumbs.map((c) => ({
      name: c.label,
      url: getAbsoluteUrl(`/products/${c.slug_path}`),
    })),
    { name: product.title, url: canonicalUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="pt-1 pb-6 sm:pt-2 sm:pb-8">
      <JsonLd schemas={[mainJsonLd, faqJsonLd, breadcrumbJsonLd]} />
      <ListingViewTracker type="product" id={product.id} />
      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#374151] dark:text-zinc-400"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/products" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Products
        </Link>
        {categoryCrumbs.map((crumb) => (
          <span key={crumb.slug_path} className="contents">
            <span aria-hidden>/</span>
            <Link
              href={`/products/${crumb.slug_path}`}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
        <span aria-hidden>/</span>
        <span className="text-[#374151] dark:text-zinc-400">{product.title}</span>
      </nav>

      <ProductDetailLayout
        images={images}
        product={product}
        brandName={brandName}
        brandHref={brandHref}
        brandLogoUrl={brandLogoUrl}
        isSaved={isSaved}
        currentPath={currentPath}
        relatedItems={relatedItems}
        listingDocuments={listingDocuments}
        signInRedirectUrl={getAbsoluteUrl(canonicalPath)}
        relatedListings={relatedListingsForLayout}
        thumbnailMap={thumbnailMap}
        teamWithProfiles={teamWithProfiles}
        relatedProducts={relatedProducts}
        mapHref={brandProfile?.username ? `/explore?type=brands&focus=${encodeURIComponent(brandProfile.username)}` : null}
        moreInCategory={moreInCategory}
        moreCategoryHref={primaryNode ? `/products/${primaryNode.slug_path}` : null}
        taxonomyTags={{
          categoryCrumbs,
          materialNodes: materialTaxNodes,
          facetGroups: taxonomyFacetGroups,
        }}
        brandOtherProducts={brandOtherProductsResult.data ?? []}
      />
      </div>
    </div>
  );
}
