import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductForProductPage } from "@/app/actions/listings";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProjectsForProduct } from "@/lib/db/projectProductLinks";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfileById } from "@/lib/db/profiles";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { PageContainer } from "@/components/layout/PageContainer";
import { DetailLayout } from "@/components/listing/DetailLayout";
import { ProductSidebarDocuments } from "@/components/listing/ProductSidebarDocuments";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { DetailHeaderBar } from "@/components/listing/DetailHeaderBar";
import { DetailSidebar, type DetailSidebarRow } from "@/components/listing/DetailSidebar";
import { TeamMemberLinks } from "@/components/listing/TeamMemberLinks";
import { MatchesStrip } from "@/components/matches/MatchesStrip";
import { productExploreUrl } from "@/lib/exploreUrls";
import { connectionsLabelText } from "@/components/listing/connectionsLabel";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";

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
  teamWithProfiles: ListingTeamMemberWithProfile[] | null
): DetailSidebarRow[] {
  const rows: DetailSidebarRow[] = [];

  const connectionsText = connectionsLabelText(product.connectionCount);
  if (connectionsText) {
    rows.push({
      label: "Connections",
      value: connectionsText,
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
  const brandHref = brandProfile?.username ? `/u/${brandProfile.username}` : null;
  const teamWithProfiles = teamResult.data ?? null;

  const images = canonicalGalleryToGalleryImages(product.gallery);
  const currentPath = `/products/${product.slug ?? product.id}`;
  const sidebarRows = buildProductSidebarRows(product, brandName, brandHref, teamWithProfiles);
  const listingDocuments = docsResult.data ?? [];
  const productPath = `/products/${product.slug ?? product.id}`;

  return (
    <PageContainer>
      <ListingViewTracker type="product" id={product.id} />
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
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
        <span className="text-zinc-500 dark:text-zinc-400">{product.title}</span>
      </nav>

      <DetailLayout
        images={images}
        listingTitle={product.title}
        context="product"
        relatedItems={relatedItems}
        entityType="product"
        entityId={product.id}
        entitySlug={product.slug ?? product.id}
        isSaved={isSaved}
        currentPath={currentPath}
        headerBar={
          <DetailHeaderBar
            entityType="product"
            entityId={product.id}
            currentPath={currentPath}
            isSaved={isSaved}
            brandLine={
              brandName && brandHref ? { name: brandName, href: brandHref } : undefined
            }
            connectionCount={product.connectionCount}
          />
        }
        belowHeader={<MatchesStrip type="product" id={product.id} title="Used in Projects" showBadge />}
        title={
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
            {product.title}
          </h1>
        }
        description={
          product.description?.trim() ? (
            <section className="prose prose-zinc dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {product.description.trim()}
              </div>
            </section>
          ) : null
        }
        sidebar={
          <>
            <DetailSidebar title="Product details" rows={sidebarRows} />
            {listingDocuments.length > 0 && (
              <div className="mt-5">
                <ProductSidebarDocuments
                  documents={listingDocuments}
                  listingId={product.id}
                  signInRedirectUrl={getAbsoluteUrl(productPath)}
                />
              </div>
            )}
          </>
        }
      />
    </PageContainer>
  );
}
