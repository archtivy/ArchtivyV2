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
 * Returns { path, hasTaxonomy } so callers know whether taxonomy was resolved.
 */
async function resolveCanonicalPath(
  productId: string,
  slug: string
): Promise<{ path: string; hasTaxonomy: boolean }> {
  const taxPath = await getListingTaxonomyPath(productId);
  if (taxPath.primary) {
    return {
      path: getListingUrl({
        id: productId,
        type: "product",
        slug,
        taxonomySlugPath: taxPath.primary.slug_path,
      }),
      hasTaxonomy: true,
    };
  }
  return { path: `/products/${slug}`, hasTaxonomy: false };
}

async function findProduct(slug: string) {
  return (await getCachedProduct(slug)) ?? (await getProductForProductPage(slug));
}

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

  // Try full path as archive
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

  if (segments.length >= 2) {
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

  // Detail page metadata
  const product = await findProduct(listingSlug);
  if (!product) return {};
  if (product.status === "PENDING") return { title: "Product" };
  const { path: canonicalPath } = await resolveCanonicalPath(product.id, product.slug ?? product.id);
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
  const listingSlug = segments[segments.length - 1];
  const taxonomyPrefix = segments.length > 1 ? segments.slice(0, -1).join("/") : null;

  const product = await findProduct(listingSlug);
  if (!product) notFound();

  // UUID → slug redirect
  if (UUID_RE.test(listingSlug) && product.slug && product.slug !== listingSlug) {
    const { path: canonical } = await resolveCanonicalPath(product.id, product.slug);
    permanentRedirect(canonical);
  }

  await authCheckPending(product);

  // Resolve canonical URL
  const { path: canonicalPath, hasTaxonomy } = await resolveCanonicalPath(
    product.id,
    product.slug ?? product.id,
  );
  const currentUrlPath = `/products/${segments.join("/")}`;

  // Redirect logic:
  // - If taxonomy was resolved AND current URL doesn't match → redirect to canonical
  // - If NO taxonomy was resolved but URL has a prefix → keep the current URL as-is
  //   (don't strip a valid taxonomy prefix just because resolution failed)
  // - If NO taxonomy and URL is flat → render as-is
  if (hasTaxonomy && canonicalPath !== currentUrlPath) {
    permanentRedirect(canonicalPath);
  }

  // For flat URLs: if taxonomy exists, redirect to canonical
  if (!taxonomyPrefix && hasTaxonomy && canonicalPath !== currentUrlPath) {
    permanentRedirect(canonicalPath);
  }

  // Render with the best available canonical path.
  // If we're on a taxonomy-prefixed URL but resolution failed, use the current URL as canonical
  // so we don't lose the taxonomy prefix.
  const effectiveCanonical = (taxonomyPrefix && !hasTaxonomy) ? currentUrlPath : canonicalPath;

  return <ProductDetailRenderer product={product} canonicalPath={effectiveCanonical} taxonomySlugPath={taxonomyPrefix} />;
}
