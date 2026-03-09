// ISR: data cache revalidates every hour; admin mutations bust it immediately via
// revalidatePath("/projects/[slug]", "page") + revalidateTag(CACHE_TAGS.listings).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

// Matches bare UUID v4. Used to detect /projects/{uuid} requests that should
// 308-redirect to the canonical /projects/{slug} URL.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
import { getSelectedPhotoMatchesByImageIds, photoMatchesExistForImages } from "@/lib/db/photoMatches";
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
import {
  buildProjectJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo/jsonld";
import {
  buildProjectSeoTitle,
  buildProjectMetaDescription,
  generateProjectFaq,
  extractMaterialNames,
  type ProjectSeoInput,
} from "@/lib/seo/seo-templates";
import { JsonLd } from "@/components/seo/JsonLd";
import { getListingTaxonomyNodes, getListingFacets, getTaxonomyAncestors } from "@/lib/taxonomy/taxonomyDb";
import type { TaxonomyCrumb, TaxonomyMaterialTag, TaxonomyFacetGroup } from "@/components/listing/TaxonomyTags";

/** Per-slug cached project fetch; busted by revalidateTag(CACHE_TAGS.listings). */
function getCachedProject(slug: string) {
  return unstable_cache(
    () => getProjectCanonicalBySlugOrId(slug),
    [`project:canonical:${slug}`],
    { tags: [CACHE_TAGS.listings, `project:${slug}`], revalidate: 3600 }
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
  const project = await getCachedProject(slug);
  if (!project) return {};
  if (project.status === "PENDING") return { title: "Project" };

  const path = `/projects/${project.slug ?? project.id}`;
  const canonical = getAbsoluteUrl(path);

  const seoInput: ProjectSeoInput = {
    title: project.title?.trim() || "Project",
    slug: project.slug ?? project.id,
    category: project.category ?? null,
    location_city: project.location?.city ?? null,
    location_country: project.location?.country ?? null,
    year: project.year ?? null,
    area_sqft: project.area_sqft ?? null,
    materials: extractMaterialNames(project.materials),
    description:
      typeof project.description === "string" ? project.description.trim() : null,
    gallery: project.gallery ?? [],
  };

  const seoTitle = buildProjectSeoTitle(seoInput);
  const metaDescription = buildProjectMetaDescription(seoInput);
  const imageUrl = project.cover
    ? project.cover.startsWith("http")
      ? project.cover
      : getAbsoluteUrl(project.cover)
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

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getCachedProject(slug);
  if (!project) notFound();

  // If the URL contains a bare UUID and the listing has a canonical slug,
  // issue a permanent (308) redirect so only the slug URL is indexed.
  if (UUID_RE.test(slug) && project.slug && project.slug !== slug) {
    permanentRedirect(`/projects/${project.slug}`);
  }

  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean } | null;
  const isAdmin = Boolean(profile?.is_admin);

  if (project.status === "PENDING") {
    const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
    if (!isOwner && !isAdmin) notFound();
  }

  const [usedResult, isSaved, teamResult, docsResult, taxNodesResult, facetsResult] = await Promise.all([
    getProductsForProject(project.id, { sources: ["manual", "photo_tag"] }).catch(() =>
      getProductsForProject(project.id)
    ),
    getGalleryBookmarkState("project", project.id),
    getListingTeamMembersWithProfiles(project.id),
    getListingDocumentsServer(project.id),
    getListingTaxonomyNodes(project.id),
    getListingFacets(project.id),
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
  if (primaryNode) {
    const ancestorsRes = await getTaxonomyAncestors(primaryNode.domain, primaryNode.slug_path);
    categoryCrumbs = (ancestorsRes.data ?? []).map((n) => ({ label: n.label, slug_path: n.slug_path }));
  }

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
      const res = await fetch(matchesUrl, { cache: "no-store" });
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

    // Lazy keyword matching: if no photo_matches rows exist, run keyword engine.
    // Deterministic, no AI/embedding dependency. Runs once per project.
    const photoMatchesExist = await photoMatchesExistForImages(imageIds);
    if (!photoMatchesExist) {
      try {
        const { computeKeywordPhotoMatches } = await import("@/lib/matches/engine");
        const result = await computeKeywordPhotoMatches(project.id);
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[projects/[slug]] lazy keyword photo_matches: project=${project.id}`,
            `upserted=${result.upserted} errors=${result.errors.length}`,
            result.errors.length ? result.errors : ""
          );
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[projects/[slug]] lazy keyword photo_matches failed:", e);
        }
      }
    }

    const [tagsResult, photoMatchesResult] = await Promise.all([
      getPhotoProductTagsByImageIds(imageIds),
      getSelectedPhotoMatchesByImageIds(imageIds),
    ]);
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
    // Group photo matches by image ID
    const photoMatches = photoMatchesResult.data ?? [];
    const matchesByImageId: Record<string, GalleryImage["matchedProducts"]> = {};
    for (const m of photoMatches) {
      (matchesByImageId[m.photo_id] ||= []).push({
        id: m.id,
        product_id: m.product_id,
        product_title: m.product_title ?? undefined,
        product_slug: m.product_slug ?? undefined,
        product_thumbnail: m.product_thumbnail ?? undefined,
        product_owner_name: m.product_owner_name ?? undefined,
        score: m.score,
        selected_mode: m.selected_mode,
      });
    }
    images = imagesWithIds
      .filter((img) => sanitizeListingImageUrl(img.image_url) !== null)
      .map((img) => ({
        id: img.id,
        src: sanitizeListingImageUrl(img.image_url) as string,
        alt: img.alt ?? "Image",
        sort_order: img.sort_order,
        photoTags: tagsByImageId[img.id] ?? [],
        matchedProducts: matchesByImageId[img.id] ?? [],
      }));
    // Each image: id = listing_images.id, photoTags = manual tags, matchedProducts = AI matches.
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

  const canonicalUrl = getAbsoluteUrl(`/projects/${project.slug ?? project.id}`);
  const mainJsonLd = buildProjectJsonLd(project, canonicalUrl);

  const seoInputForPage: ProjectSeoInput = {
    title: project.title?.trim() || "Project",
    slug: project.slug ?? project.id,
    category: project.category ?? null,
    location_city: project.location?.city ?? null,
    location_country: project.location?.country ?? null,
    year: project.year ?? null,
    area_sqft: project.area_sqft ?? null,
    materials: extractMaterialNames(project.materials),
    description:
      typeof project.description === "string" ? project.description.trim() : null,
    gallery: project.gallery ?? [],
  };

  const faqJsonLd = buildFaqJsonLd(generateProjectFaq(seoInputForPage));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl("/explore/projects") },
    { name: project.title, url: canonicalUrl },
  ]);

  return (
    <div className="pt-1 pb-6 sm:pt-2 sm:pb-8">
      <JsonLd schemas={[mainJsonLd, faqJsonLd, breadcrumbJsonLd]} />
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
        taxonomyTags={{
          categoryCrumbs,
          materialNodes: materialTaxNodes,
          facetGroups: taxonomyFacetGroups,
        }}
      />
    </div>
  );
}
