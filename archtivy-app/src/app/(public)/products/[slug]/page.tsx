// ISR: data cache revalidates every hour; admin mutations bust it via
// revalidatePath("/products/[slug]", "page") + revalidateTag(CACHE_TAGS.listings).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProductForProductPage } from "@/app/actions/listings";
import { getProductCanonicalBySlug } from "@/lib/db/explore";
import { getProductsCanonicalFiltered } from "@/lib/db/explore";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProjectsForProduct } from "@/lib/db/projectProductLinks";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfileById, getProfileByClerkId } from "@/lib/db/profiles";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProductDetailLayout } from "@/components/listing/ProductDetailLayout";
import { DEFAULT_PRODUCT_FILTERS } from "@/lib/exploreFilters";
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

/** Per-slug cached product fetch; busted by revalidateTag(CACHE_TAGS.listings). */
function getCachedProduct(slug: string) {
  return unstable_cache(
    () => getProductCanonicalBySlug(slug),
    [`product:canonical:${slug}`],
    { tags: [CACHE_TAGS.listings, `product:${slug}`], revalidate: 3600 }
  )();
}

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
  if (!product) return {};
  if (product.status === "PENDING") return { title: "Product" };

  const path = `/products/${product.slug ?? product.id}`;
  const canonical = getAbsoluteUrl(path);

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
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article",
      title: seoTitle,
      description: metaDescription,
      url: canonical,
      siteName: "Archtivy",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: seoInput.title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: metaDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
  if (!product) notFound();

  // If the URL contains a bare UUID and the listing has a canonical slug,
  // issue a permanent (308) redirect so only the slug URL is indexed.
  if (UUID_RE.test(slug) && product.slug && product.slug !== slug) {
    permanentRedirect(`/products/${product.slug}`);
  }

  if (product.status === "PENDING") {
    const { userId } = await auth();
    const profileRes = await getProfileByClerkId(userId ?? "");
    const profile = profileRes.data as { is_admin?: boolean } | null;
    const isOwner = Boolean(userId && product.owner_clerk_user_id === userId);
    const isAdmin = Boolean(profile?.is_admin);
    if (!isOwner && !isAdmin) notFound();
  }

  const [relatedResult, isSaved, brandResult, teamResult, docsResult] = await Promise.all([
    getProjectsForProduct(product.id),
    getGalleryBookmarkState("product", product.id),
    product.brand_profile_id ? getProfileById(product.brand_profile_id) : Promise.resolve({ data: null, error: null }),
    getListingTeamMembersWithProfiles(product.id),
    getListingDocumentsServer(product.id),
  ]);

  const relatedListings = relatedResult.data ?? [];
  const projectIds = relatedListings.map((p) => p.id);
  const thumbnailMap =
    projectIds.length > 0
      ? (await getFirstImageUrlPerListingIds(projectIds)).data ?? {}
      : {};

  const productCategory =
    (product.product_category ?? product.category)?.trim() ?? "";

  // Fetch same-category products for relatedProducts fallback and "More in this category" (limit 6)
  const sameCategoryProducts: { id: string; slug: string; title: string; thumbnail?: string | null }[] = productCategory
    ? ((await getProductsCanonicalFiltered({
        filters: { ...DEFAULT_PRODUCT_FILTERS, product_category: productCategory },
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
  const currentPath = `/products/${product.slug ?? product.id}`;
  const listingDocuments = docsResult.data ?? [];
  const productPath = `/products/${product.slug ?? product.id}`;

  const relatedListingsForLayout = relatedListings.map((p) => {
    const row = p as { id: string; slug?: string; title: string; location?: string | null };
    return { id: row.id, slug: row.slug, title: row.title, location: row.location ?? null };
  });

  const canonicalUrl = getAbsoluteUrl(`/products/${product.slug ?? product.id}`);
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
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: getAbsoluteUrl("/explore/products") },
    { name: product.title, url: canonicalUrl },
  ]);

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
        <Link href="/explore/products" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Products
        </Link>
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
        signInRedirectUrl={getAbsoluteUrl(productPath)}
        relatedListings={relatedListingsForLayout}
        thumbnailMap={thumbnailMap}
        teamWithProfiles={teamWithProfiles}
        relatedProducts={relatedProducts}
        mapHref={null}
        moreInCategory={moreInCategory}
      />
      </div>
    </div>
  );
}
