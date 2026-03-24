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

/** Max taxonomy depth (type/category/subcategory) + 1 listing slug = 4 segments. */
const MAX_SEGMENTS = 4;

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

/**
 * Try to find a product by the last segment (the listing slug).
 * Returns null if not found.
 */
async function findProduct(slug: string) {
  return (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
}

/**
 * Auth-gate for PENDING listings.
 */
async function authCheckPending(product: { status: string; owner_clerk_user_id?: string | null }) {
  if (product.status !== "PENDING") return;
  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean } | null;
  const isOwner = Boolean(userId && product.owner_clerk_user_id === userId);
  const isAdmin = Boolean(profile?.is_admin);
  if (!isOwner && !isAdmin) notFound();
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}): Promise<Metadata> {
  const { segments } = await params;
  if (segments.length > MAX_SEGMENTS) return {};

  const listingSlug = segments[segments.length - 1];
  const taxonomyParts = segments.slice(0, -1);
  const taxonomySlugPath = taxonomyParts.length > 0 ? taxonomyParts.join("/") : null;

  // If only 1 segment, check if it's an archive page first
  if (segments.length === 1) {
    const archiveData = await fetchProductArchive(segments[0]);
    if (archiveData) {
      const { node } = archiveData;
      return {
        title: node.seo_title || `${node.label} Products | Archtivy`,
        description: node.meta_description || node.description || `Browse ${node.label.toLowerCase()} products on Archtivy.`,
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  // If 2+ segments, check if ALL segments form an archive slug_path
  if (taxonomySlugPath) {
    const fullSlug = segments.join("/");
    const archiveData = await fetchProductArchive(fullSlug);
    if (archiveData) {
      const { node } = archiveData;
      return {
        title: node.seo_title || `${node.label} Products | Archtivy`,
        description: node.meta_description || node.description || `Browse ${node.label.toLowerCase()} products on Archtivy.`,
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  // Otherwise it's a detail page — last segment is the listing slug
  const product = await findProduct(listingSlug);
  if (!product) return {};
  if (product.status === "PENDING") return { title: "Product" };
  const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);
  return buildProductDetailMetadata(product, canonicalPath);
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

  if (segments.length > MAX_SEGMENTS) notFound();

  // ── Try as archive page first ──────────────────────────────────────────
  // Check progressively: try full path as archive, then without last segment.
  // This handles: /products/furniture (1 seg), /products/furniture/seating (2 seg),
  // /products/furniture/seating/armchair (3 seg — could be archive OR detail)

  // Try the FULL segment path as an archive
  const fullSlugPath = segments.join("/");
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const fullArchive = await fetchProductArchive(fullSlugPath, pageNum);
  if (fullArchive) {
    return (
      <ProductCategoryArchive
        node={fullArchive.node}
        ancestors={fullArchive.ancestors}
        childNodes={fullArchive.childNodes}
        listings={fullArchive.listings}
        total={fullArchive.total}
        page={fullArchive.page}
        totalPages={fullArchive.totalPages}
      />
    );
  }

  // ── Not an archive — treat as detail page ──────────────────────────────
  // Last segment is the listing slug; preceding segments are taxonomy path
  const listingSlug = segments[segments.length - 1];

  // UUID → slug redirect
  const product = await findProduct(listingSlug);
  if (!product) notFound();

  if (UUID_RE.test(listingSlug) && product.slug && product.slug !== listingSlug) {
    const canonical = await resolveCanonicalPath(product.id, product.slug);
    permanentRedirect(canonical);
  }

  await authCheckPending(product);

  // Resolve canonical URL
  const canonicalPath = await resolveCanonicalPath(product.id, product.slug ?? product.id);
  const currentUrlPath = `/products/${segments.join("/")}`;

  // Redirect to canonical if URL doesn't match
  if (canonicalPath !== currentUrlPath) {
    permanentRedirect(canonicalPath);
  }

  return <ProductDetailRenderer product={product} canonicalPath={canonicalPath} />;
}
