export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProductForProductPage } from "@/app/actions/listings";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProjectsForProduct } from "@/lib/db/projectProductLinks";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfileById, getProfileByClerkId } from "@/lib/db/profiles";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProductDetailLayout } from "@/components/listing/ProductDetailLayout";
import { getProductsCanonicalFiltered } from "@/lib/db/explore";
import { DEFAULT_PRODUCT_FILTERS } from "@/lib/exploreFilters";
import type { GalleryImage } from "@/lib/db/gallery";

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
  const product = await getProductForProductPage(slug);
  if (!product) return {};
  if (product.status === "PENDING") {
    return { title: "Product" };
  }
  const path = `/products/${product.slug ?? product.id}`;
  const title = product.title?.trim() || "Product";
  const description =
    (typeof product.description === "string" && product.description.trim().slice(0, 160)) ||
    `${title} on Archtivy. Projects, products & credits for architecture.`;
  const imageUrl = product.cover
    ? (product.cover.startsWith("http") ? product.cover : getAbsoluteUrl(product.cover))
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: getAbsoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(path),
      ...(imageUrl && { images: [{ url: imageUrl, width: 1200, height: 630, alt: title }] }),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductForProductPage(slug);
  if (!product) notFound();
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

  let relatedProducts: { id: string; slug?: string; title: string; thumbnail?: string | null }[] = [];
  if (relatedListings.length === 0 && product.category?.trim()) {
    const { data: sameCategory } = await getProductsCanonicalFiltered({
      filters: { ...DEFAULT_PRODUCT_FILTERS, category: [product.category.trim()] },
      limit: 9,
      sort: "newest",
    });
    relatedProducts = (sameCategory ?? [])
      .filter((p) => p.id !== product.id)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        slug: p.slug ?? p.id,
        title: p.title,
        thumbnail: p.cover ?? null,
      }));
  }

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

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="pt-1 pb-6 sm:pt-2 sm:pb-8">
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
      />
      </div>
    </div>
  );
}
