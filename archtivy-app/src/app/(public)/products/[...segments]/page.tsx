// ISR: data cache revalidates every hour; admin mutations bust it immediately via
// revalidatePath + revalidateTag(CACHE_TAGS.listings).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProductCanonicalBySlug } from "@/lib/db/explore";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { canManageListing } from "@/lib/auth/listingOwnership";
import { getListingUrl } from "@/lib/canonical";
import { fetchProductArchive } from "@/lib/archive/fetchArchiveData";
import { archiveIntro } from "@/lib/archive/copy";
import { getProductsDirectory } from "@/lib/db/productsDirectory";
import { parseProductDirectoryState } from "@/lib/products/directoryParams";
import { isSearchResultUrl, toSearchParams } from "@/lib/discovery/indexation";
import { ProductCategoryArchive } from "@/components/archive/ProductCategoryArchive";
import { getListingTaxonomyPath } from "@/lib/taxonomy/resolve";
import { buildProductDetailMetadata } from "@/app/(public)/products/_lib/productDetailRenderer";
import { ProductDetailView } from "@/components/products/ProductDetailView";

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

/**
 * Cache first, then one uncached read.
 *
 * The second call used to be getProductForProductPage, a server action that ran
 * a "safety backfill": on a miss it looked the slug up in the `products` sidecar
 * and wrote the missing listings row from it, ownerless and APPROVED. That
 * turned a data fault into a published, unmanageable listing. It is gone; see
 * the note where it used to live in app/actions/listings.ts.
 *
 * The uncached retry is kept because unstable_cache also caches a null, and a
 * product published seconds ago should not 404 for an hour on a cached miss.
 * It now resolves through `listings` like every other read, so a `products` row
 * with no listing is simply not found — which is the correct answer.
 */
async function findProduct(slug: string) {
  return (await getCachedProduct(slug)) ?? (await getProductCanonicalBySlug(slug));
}

/**
 * Statuses that are NOT publicly visible. A row in one of these renders only
 * for its owner or an admin; everyone else gets a 404.
 *
 * DRAFT was added with the publish-flow migration (20260810). Before that this
 * tested PENDING alone and returned early for anything else — so a DRAFT row
 * would have fallen straight through and rendered publicly. These two guards
 * (here and in the sibling route) are the only thing standing between a draft
 * and the open web: every directory, sitemap, explore and related-rail query
 * filters status = APPROVED explicitly, and neither detail route prerenders.
 */
const NON_PUBLIC_STATUSES = new Set(["PENDING", "DRAFT"]);

async function authCheckPending(product: {
  status: string;
  owner_clerk_user_id?: string | null;
  brand_profile_id?: string | null;
}) {
  if (!NON_PUBLIC_STATUSES.has(product.status)) return;
  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean; id?: string | null } | null;
  // Both owner columns. ProductCanonical exposes listings.owner_profile_id
  // under the name brand_profile_id, so it is mapped across here — testing
  // owner_clerk_user_id alone made this fail CLOSED for the 118 of 129 live
  // listings that carry only owner_profile_id, 404ing authors on their own
  // draft.
  const isOwner = canManageListing(
    {
      owner_clerk_user_id: product.owner_clerk_user_id,
      owner_profile_id: product.brand_profile_id,
    },
    userId,
    profile?.id ?? null
  );
  const isAdmin = Boolean(profile?.is_admin);
  if (!isOwner && !isAdmin) notFound();
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  /* A category archive is indexable; the same archive with a query on it is an
     internal search result, and there is a combinatorial number of those.
     `noindex, follow` on any query, canonical still the clean archive path. */
  const searchRobots = isSearchResultUrl(sp)
    ? ({ index: false, follow: true } as const)
    : ({ index: true, follow: true } as const);
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
        description: archiveIntro("product", node),
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: searchRobots,
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
        description: archiveIntro("product", node),
        alternates: { canonical: `/products/${node.slug_path}` },
        robots: searchRobots,
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  // Detail page metadata
  const product = await findProduct(listingSlug);
  if (!product) return {};
  // Non-public rows never emit real metadata — a draft must not leak its
  // title, description or OG image to a crawler or a link unfurler.
  if (NON_PUBLIC_STATUSES.has(product.status)) return { title: "Product", robots: { index: false, follow: false } };
  const { path: canonicalPath } = await resolveCanonicalPath(product.id, product.slug ?? product.id);
  return buildProductDetailMetadata(product, canonicalPath);
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProductSegmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { segments } = await params;
  const sp = await searchParams;

  if (segments.length > MAX_SEGMENTS) notFound();

  // ── Try as archive page first ──────────────────────────────────────────
  const fullSlugPath = segments.join("/");
  const fullArchive = await fetchProductArchive(fullSlugPath);
  if (fullArchive) {
    /*
     * The archive keeps its taxonomy node — title, intro, breadcrumb,
     * subcategory links, JSON-LD — and hands the RESULTS to the same directory
     * body /products renders, scoped to this node's slug_path. `page` is no
     * longer read: the directory ships the whole set and reveals it with Load
     * more, so a page number has nothing left to address.
     */
    const directory = await getProductsDirectory();
    return (
      <ProductCategoryArchive
        node={fullArchive.node}
        ancestors={fullArchive.ancestors}
        childNodes={fullArchive.childNodes}
        siblingNodes={fullArchive.siblingNodes}
        directory={directory}
        state={parseProductDirectoryState(toSearchParams(sp))}
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

  // Cream editorial detail page (Entity Detail Layout archetype). The previous
  // renderer remains at _lib/productDetailRenderer.tsx and still supplies
  // buildProductDetailMetadata() above, so metadata behaviour is unchanged.
  return <ProductDetailView product={product} canonicalPath={effectiveCanonical} />;
}
