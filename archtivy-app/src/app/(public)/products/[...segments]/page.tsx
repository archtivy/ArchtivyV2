// ISR: data cache revalidates every hour; admin mutations bust it immediately via
// revalidatePath + revalidateTag(CACHE_TAGS.listings).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProductCanonicalBySlug } from "@/lib/db/explore";
import { getProductForProductPage } from "@/app/actions/listings";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getListingUrl } from "@/lib/canonical";
import { fetchProductArchive } from "@/lib/archive/fetchArchiveData";
import { ProductCategoryArchive } from "@/components/archive/ProductCategoryArchive";
import { getListingTaxonomyPath } from "@/lib/taxonomy/resolve";
import {
  ProductDetailRenderer,
  buildProductDetailMetadata,
} from "@/app/(public)/products/_lib/productDetailRenderer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Per-slug cached product fetch; busted by revalidateTag(CACHE_TAGS.listings). */
function getCachedProduct(slug: string) {
  return unstable_cache(
    () => getProductCanonicalBySlug(slug),
    [`product:canonical:${slug}`],
    { tags: [CACHE_TAGS.listings, CACHE_TAGS.matches, `product:${slug}`], revalidate: 3600 }
  )();
}

/**
 * Resolve the canonical detail path for a product.
 */
async function resolveCanonicalPath(
  productId: string,
  slug: string
): Promise<string> {
  const taxPath = await getListingTaxonomyPath(productId);
  if (taxPath.primary) {
    return getListingUrl({
      id: productId,
      type: "product",
      slug,
      taxonomySlugPath: taxPath.primary.slug_path,
    });
  }
  return `/products/${slug}`;
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}): Promise<Metadata> {
  const { segments } = await params;
  if (segments.length > 3) return {};

  if (segments.length === 1) {
    const [slug] = segments;
    const archiveData = await fetchProductArchive(slug);
    if (archiveData) {
      const { node } = archiveData;
      const title = node.seo_title || `${node.label} Products | Archtivy`;
      const description =
        node.meta_description ||
        node.description ||
        `Browse ${node.label.toLowerCase()} products on Archtivy.`;
      return {
        title,
        description,
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
    const product = (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
    if (!product) return {};
    if (product.status === "PENDING") return { title: "Product" };
    const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);
    return buildProductDetailMetadata(product, canonicalPath);
  }

  if (segments.length === 2) {
    const [cat, slugOrSub] = segments;
    const slugPath = `${cat}/${slugOrSub}`;
    const archiveData = await fetchProductArchive(slugPath);
    if (archiveData) {
      const { node } = archiveData;
      const title = node.seo_title || `${node.label} Products | Archtivy`;
      const description =
        node.meta_description ||
        node.description ||
        `Browse ${node.label.toLowerCase()} products on Archtivy.`;
      return {
        title,
        description,
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
    const product = (await getCachedProduct(slugOrSub)) ?? (await getProductForProductPage(slugOrSub));
    if (!product) return {};
    if (product.status === "PENDING") return { title: "Product" };
    return buildProductDetailMetadata(product, `/products/${cat}/${product.slug ?? product.id}`);
  }

  if (segments.length === 3) {
    const [, , listingSlug] = segments;
    const product = (await getCachedProduct(listingSlug)) ?? (await getProductForProductPage(listingSlug));
    if (!product) return {};
    if (product.status === "PENDING") return { title: "Product" };
    const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);
    return buildProductDetailMetadata(product, canonicalPath);
  }

  return {};
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProductSegmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { segments } = await params;
  const { page: pageParam } = await searchParams;

  if (segments.length > 3) notFound();

  // ── 1 segment: /products/{slug} ──
  if (segments.length === 1) {
    const [slug] = segments;

    // Archive check
    const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
    const archiveData = await fetchProductArchive(slug, pageNum);
    if (archiveData) {
      return (
        <ProductCategoryArchive
          node={archiveData.node}
          ancestors={archiveData.ancestors}
          children={archiveData.children}
          listings={archiveData.listings}
          total={archiveData.total}
          page={archiveData.page}
          totalPages={archiveData.totalPages}
        />
      );
    }

    // Detail page
    const product = (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
    if (!product) notFound();

    // UUID → slug redirect
    if (UUID_RE.test(slug) && product.slug && product.slug !== slug) {
      const canonical = await resolveCanonicalPath(product.id, product.slug);
      permanentRedirect(canonical);
    }

    // Auth check for PENDING
    if (product.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && product.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    // Redirect to canonical taxonomy-aware URL if taxonomy exists
    const taxPath = await getListingTaxonomyPath(product.id);
    if (taxPath.primary && product.slug) {
      const canonical = getListingUrl({
        id: product.id,
        type: "product",
        slug: product.slug,
        taxonomySlugPath: taxPath.primary.slug_path,
      });
      permanentRedirect(canonical);
    }

    // Fallback: no taxonomy
    const canonicalPath = `/products/${product.slug ?? product.id}`;
    return <ProductDetailRenderer product={product} canonicalPath={canonicalPath} />;
  }

  // ── 2 segments: /products/{cat}/{slugOrSub} ──
  if (segments.length === 2) {
    const [cat, slugOrSub] = segments;
    const slugPath = `${cat}/${slugOrSub}`;

    // Archive check
    const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
    const archiveData = await fetchProductArchive(slugPath, pageNum);
    if (archiveData) {
      return (
        <ProductCategoryArchive
          node={archiveData.node}
          ancestors={archiveData.ancestors}
          children={archiveData.children}
          listings={archiveData.listings}
          total={archiveData.total}
          page={archiveData.page}
          totalPages={archiveData.totalPages}
        />
      );
    }

    // Detail page
    const product = (await getCachedProduct(slugOrSub)) ?? (await getProductForProductPage(slugOrSub));
    if (!product) notFound();

    const taxPath = await getListingTaxonomyPath(product.id);
    const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);

    // Auth check for PENDING
    if (product.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && product.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    // Redirect if URL doesn't match canonical
    const currentUrlPath = `/products/${cat}/${product.slug ?? product.id}`;
    if (canonicalPath !== currentUrlPath) {
      permanentRedirect(canonicalPath);
    }

    if (taxPath.category && taxPath.category.slug !== cat) {
      permanentRedirect(canonicalPath);
    }

    return <ProductDetailRenderer product={product} canonicalPath={canonicalPath} />;
  }

  // ── 3 segments: /products/{cat}/{subcat}/{listingSlug} ──
  if (segments.length === 3) {
    const [cat, subcat, listingSlug] = segments;

    const product = (await getCachedProduct(listingSlug)) ?? (await getProductForProductPage(listingSlug));
    if (!product) notFound();

    // Auth check for PENDING
    if (product.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && product.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);
    const currentUrlPath = `/products/${cat}/${subcat}/${product.slug ?? product.id}`;
    if (canonicalPath !== currentUrlPath) {
      permanentRedirect(canonicalPath);
    }

    return <ProductDetailRenderer product={product} canonicalPath={canonicalPath} />;
  }

  notFound();
}
