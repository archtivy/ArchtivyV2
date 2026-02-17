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
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProductDetailLayout } from "@/components/listing/ProductDetailLayout";
import { TeamMemberLinks } from "@/components/listing/TeamMemberLinks";
import { type DetailSidebarRow } from "@/components/listing/DetailSidebar";
import { productExploreUrl } from "@/lib/exploreUrls";
import { connectionsLabelText } from "@/components/listing/connectionsLabel";
import { getColorSwatch } from "@/lib/colors";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";

async function getProductColorOptions(productId: string): Promise<string[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("products").select("color_options").eq("id", productId).maybeSingle();
  const arr = (data as { color_options?: string[] | null } | null)?.color_options;
  return Array.isArray(arr) ? arr : [];
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

function buildProductSidebarRows(
  product: ProductCanonical,
  brandName: string | null,
  brandHref: string | null,
  teamWithProfiles: ListingTeamMemberWithProfile[] | null,
  colorOptions: string[] = []
): DetailSidebarRow[] {
  const rows: DetailSidebarRow[] = [];

  const connectionsText = connectionsLabelText(product.connectionCount);
  if (connectionsText) {
    rows.push({
      label: "Connections",
      value: connectionsText,
    });
  }

  if (colorOptions.length > 0) {
    rows.push({
      label: "Color options",
      value: (
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getColorSwatch(c) }}
              />
              {c}
            </span>
          ))}
        </div>
      ),
    });
  }

  const materials = product.materials ?? [];
  if (materials.length > 0) {
    rows.push({
      label: "Materials",
      value: (
        <div className="flex flex-wrap gap-2">
          {materials.map((m) => (
            <Link
              key={m.id}
              href={productExploreUrl({ materials: [m.slug] })}
              className="rounded-full bg-archtivy-primary/10 px-3 py-1 text-xs font-medium text-archtivy-primary transition hover:bg-archtivy-primary/15 hover:underline dark:bg-archtivy-primary/20"
            >
              {m.name}
            </Link>
          ))}
        </div>
      ),
    });
  }

  if (product.category?.trim()) {
    rows.push({
      label: "Category",
      value: product.category.trim(),
      href: productExploreUrl({ category: product.category }),
    });
  }

  if (product.material_type?.trim()) {
    rows.push({
      label: "Material Type",
      value: product.material_type.trim(),
      href: productExploreUrl({ material_type: product.material_type }),
    });
  }

  if (product.color?.trim()) {
    rows.push({
      label: "Color",
      value: product.color.trim(),
      href: productExploreUrl({ color: product.color }),
    });
  }

  if (product.year != null && !Number.isNaN(product.year)) {
    rows.push({
      label: "Year",
      value: String(product.year),
      href: productExploreUrl({ year: product.year }),
    });
  }

  if (brandName?.trim() || brandHref) {
    rows.push({
      label: "Brand",
      value: brandName?.trim() || "View profile",
      href: brandHref ?? undefined,
    });
  }

  if (teamWithProfiles && teamWithProfiles.length > 0) {
    rows.push({
      label: "Team Members",
      value: <TeamMemberLinks members={teamWithProfiles} />,
    });
  } else {
    const teamMembers = Array.isArray(product.team_members) ? product.team_members : [];
    const names = teamMembers
      .filter((m) => m && typeof m === "object" && typeof (m as { name?: string }).name === "string")
      .map((m) => ((m as { name: string }).name || "").trim())
      .filter(Boolean);
    if (names.length > 0) {
      rows.push({
        label: "Team Members",
        value: names.join(", "),
      });
    }
  }

  return rows;
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

  const brandProfile = brandResult.data;
  const brandName = brandProfile?.display_name?.trim() || brandProfile?.username?.trim() || null;
  const brandHref =
    brandProfile?.username
      ? `/u/${brandProfile.username}`
      : product.brand_profile_id
        ? `/u/id/${product.brand_profile_id}`
        : null;
  const teamWithProfiles = teamResult.data ?? null;
  const colorOptions = await getProductColorOptions(product.id);

  const images = canonicalGalleryToGalleryImages(product.gallery);
  const currentPath = `/products/${product.slug ?? product.id}`;
  const sidebarRows = buildProductSidebarRows(product, brandName, brandHref, teamWithProfiles, colorOptions);
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
        isSaved={isSaved}
        currentPath={currentPath}
        relatedItems={relatedItems}
        sidebarRows={sidebarRows}
        listingDocuments={listingDocuments}
        signInRedirectUrl={getAbsoluteUrl(productPath)}
        relatedListings={relatedListingsForLayout}
        thumbnailMap={thumbnailMap}
        teamWithProfiles={teamWithProfiles}
        mapHref={null}
      />
      </div>
    </div>
  );
}
