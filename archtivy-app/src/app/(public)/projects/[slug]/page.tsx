export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import {
  getProjectCanonicalBySlugOrId,
  getProjectsCanonicalFiltered,
} from "@/lib/db/explore";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getAbsoluteUrl, getBaseUrl } from "@/lib/canonical";
import { getProductsForProject } from "@/lib/db/projectProductLinks";
import {
  getFirstImageUrlPerListingIds,
  getListingImagesWithIds,
  sanitizeListingImageUrl,
} from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { resolveMentionedProducts } from "@/lib/db/mentionedProducts";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProjectDetailLayout } from "@/components/listing/ProjectDetailLayout";
import { MoreInCategoryBlock } from "@/components/listing/MoreInCategoryBlock";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
import type { UsedProductItem } from "@/components/listing/ProjectDetailContent";
import { DEFAULT_PROJECT_FILTERS } from "@/lib/exploreFilters";

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
  const project = await getProjectCanonicalBySlugOrId(slug);
  if (!project) return {};
  if (project.status === "PENDING") {
    return { title: "Project" };
  }
  const path = `/projects/${project.slug ?? project.id}`;
  const title = project.title?.trim() || "Project";
  const description =
    (typeof project.description === "string" && project.description.trim().slice(0, 160)) ||
    `${title} on Archtivy. Projects, products & credits for architecture.`;
  const imageUrl = project.cover
    ? (project.cover.startsWith("http") ? project.cover : getAbsoluteUrl(project.cover))
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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectCanonicalBySlugOrId(slug);
  if (!project) notFound();

  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean } | null;
  const isAdmin = Boolean(profile?.is_admin);

  if (project.status === "PENDING") {
    const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
    if (!isOwner && !isAdmin) notFound();
  }

  const [usedResult, isSaved, teamResult, docsResult] = await Promise.all([
    getProductsForProject(project.id, { sources: ["manual", "photo_tag"] }).catch(() =>
      getProductsForProject(project.id)
    ),
    getGalleryBookmarkState("project", project.id),
    getListingTeamMembersWithProfiles(project.id),
    getListingDocumentsServer(project.id),
  ]);
  const usedListingsRaw = usedResult.data ?? [];
  const usedListings = Array.from(
    new Map(usedListingsRaw.map((p) => [p.id, p])).values()
  );
  const relatedIds = usedListings.map((p) => p.id);
  const thumbnailMap =
    relatedIds.length > 0
      ? (await getFirstImageUrlPerListingIds(relatedIds)).data ?? {}
      : {};

  const usedProducts: UsedProductItem[] = usedListings.map((p) => {
    const row = p as {
      id: string;
      slug?: string;
      title: string;
      description?: string | null;
      brands_used?: { name?: string }[];
    };
    const brand = row.brands_used?.[0]?.name?.trim() ?? null;
    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      brand: brand || null,
      thumbnail: thumbnailMap[row.id] ?? null,
    };
  });

  const documents = (docsResult.data ?? []).map((d) => ({
    id: d.id,
    file_url: d.file_url,
    file_name: d.file_name,
  }));

  let suggestedItems: { id: string; slug: string; title: string; thumbnail?: string | null }[] = [];
  if (usedProducts.length === 0) {
    const baseUrl = getBaseUrl();
    const matchesUrl = `${baseUrl}/api/matches/project?projectId=${encodeURIComponent(project.id)}&tier=all&limit=8`;
    try {
      const res = await fetch(matchesUrl, { next: { revalidate: 300 } });
      const data = (await res.json()) as { items?: { id: string; slug: string; title: string; primary_image?: string | null }[] };
      const items = Array.isArray(data.items) ? data.items : [];
      suggestedItems = items.map((item) => ({
        id: item.id,
        slug: item.slug ?? item.id,
        title: item.title,
        thumbnail: item.primary_image ?? null,
      }));
    } catch {
      suggestedItems = [];
    }
  }

  const relatedItems = usedProducts.length > 0
    ? usedProducts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        subtitle: p.brand ?? null,
        thumbnail: p.thumbnail ?? undefined,
      }))
    : suggestedItems.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        subtitle: null,
        thumbnail: s.thumbnail ?? undefined,
      }));

  const teamWithProfiles = teamResult.data ?? null;

  const imagesWithIdsResult = await getListingImagesWithIds(project.id);
  const imagesWithIds = imagesWithIdsResult.data ?? [];
  let images: GalleryImage[];
  if (imagesWithIds.length > 0) {
    const imageIds = imagesWithIds.map((i) => i.id);
    const tagsResult = await getPhotoProductTagsByImageIds(imageIds);
    const tags = tagsResult.data ?? [];
    const tagsByImageId: Record<string, { id: string; x: number; y: number; product_id: string; product_title?: string; product_slug?: string; product_thumbnail?: string; product_owner_name?: string }[]> = {};
    for (const t of tags) {
      const key =
        typeof t.listing_image_id === "string"
          ? t.listing_image_id
          : (t.listing_image_id as { id?: string } | null)?.id;

      if (!key) continue;
      const product = t.product;
      if (!t.product_id) continue;
      (tagsByImageId[key] ||= []).push({
        id: t.id,
        x: t.x,
        y: t.y,
        product_id: t.product_id,
        product_title: product?.title ?? undefined,
        product_slug: product?.slug ?? undefined,
        product_thumbnail: product?.thumbnail ?? undefined,
        product_owner_name: product?.brand ?? undefined,
      });
    }
    images = imagesWithIds.map((img) => {
      const src = sanitizeListingImageUrl(img.image_url);
      return {
        id: img.id,
        src: src ?? "",
        alt: img.alt ?? "Image",
        sort_order: img.sort_order,
        photoTags: tagsByImageId[img.id] ?? [],
      };
    });
    // Each image: id = listing_images.id, photoTags = tags for that image only (for Lightbox per-image sidebar).
  } else {
    images = canonicalGalleryToGalleryImages(project.gallery);
  }

  const mentionedRaw = project.mentioned_products ?? [];
  const mentionedResolved = mentionedRaw.length > 0 ? await resolveMentionedProducts(mentionedRaw) : [];

  let moreInCategory: { id: string; slug: string | null; title: string; thumbnail?: string | null; location?: string | null }[] = [];
  const categoryTrim = project.category?.trim();
  if (categoryTrim) {
    const { data: sameCat } = await getProjectsCanonicalFiltered({
      filters: { ...DEFAULT_PROJECT_FILTERS, category: [categoryTrim] },
      limit: 9,
      sort: "newest",
    });
    moreInCategory = (sameCat ?? [])
      .filter((p) => p.id !== project.id)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        slug: p.slug ?? null,
        title: p.title,
        thumbnail: p.cover ?? null,
        location: p.location_text ?? null,
      }));
  }

  const currentPath = `/projects/${project.slug ?? project.id}`;
  const productsCount = usedProducts.length;
  const professionalsCount = teamWithProfiles?.length ?? 0;
  const connectionLine =
    productsCount > 0 || professionalsCount > 0
      ? `Connected to ${productsCount} product${productsCount !== 1 ? "s" : ""} and ${professionalsCount} professional${professionalsCount !== 1 ? "s" : ""}.`
      : null;
  const mapHref =
    project.location?.lat != null && project.location?.lng != null
      ? `https://www.google.com/maps?q=${project.location.lat},${project.location.lng}`
      : null;

  return (
    <div className="pt-1 pb-6 sm:pt-2 sm:pb-8">
      <ListingViewTracker type="project" id={project.id} />
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#374151] dark:text-zinc-400"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/explore/projects" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Projects
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[#374151] dark:text-zinc-400">{project.title}</span>
      </nav>

      <ProjectDetailLayout
        images={images}
        project={project}
        usedProducts={usedProducts}
        mentionedResolved={mentionedResolved}
        teamWithProfiles={teamWithProfiles}
        documents={documents}
        relatedItems={relatedItems}
        isSaved={isSaved}
        currentPath={currentPath}
        connectionLine={connectionLine}
        mapHref={mapHref}
        moreInCategory={moreInCategory}
      />
    </div>
  );
}
