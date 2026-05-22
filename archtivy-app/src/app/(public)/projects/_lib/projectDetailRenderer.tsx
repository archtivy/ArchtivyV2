/**
 * Shared project detail renderer.
 * Handles all data loading + JSX for the project detail page.
 * Called by the catch-all route after URL validation/redirects are resolved.
 */

import Link from "next/link";
import { getAbsoluteUrl, getBaseUrl, getListingUrl } from "@/lib/canonical";
import { getProjectsCanonicalFiltered } from "@/lib/db/explore";
import { getProductsForProject } from "@/lib/db/projectProductLinks";
import {
  getFirstImageUrlPerListingIds,
  getListingImagesWithIds,
  sanitizeListingImageUrl,
} from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { getSelectedPhotoMatchesByImageIds, photoMatchesExistForImages } from "@/lib/db/photoMatches";
import { getRegionsByImageIds } from "@/lib/db/imageRegions";
import { getListingDocumentsServer } from "@/lib/db/listingDocuments";
import { resolveMentionedProducts } from "@/lib/db/mentionedProducts";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getOtherProjectsByOwner, getTeamMemberOtherProjects, getCollaborationPairs, getProjectsByCountry, getDesignersByCountry } from "@/lib/db/networkDiscovery";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { ProjectDetailLayout } from "@/components/listing/ProjectDetailLayout";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProjectCanonical } from "@/lib/canonical-models";
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

/**
 * Build SEO metadata for a project detail page.
 * Pure function — no side effects.
 */
export function buildProjectDetailMetadata(
  project: ProjectCanonical,
  canonicalPath: string
) {
  const canonical = getAbsoluteUrl(canonicalPath);
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
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "article" as const,
      title: seoTitle,
      description: metaDescription,
      url: canonical,
      siteName: "Archtivy",
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: seoInput.title }],
      }),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: seoTitle,
      description: metaDescription,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

/**
 * Async Server Component that loads all data and renders the project detail page.
 * The route is responsible for fetching the project, handling auth, and redirects.
 */
export async function ProjectDetailRenderer({
  project,
  canonicalPath,
  taxonomySlugPath,
}: {
  project: ProjectCanonical;
  canonicalPath: string;
  /** Taxonomy slug path from URL segments (e.g. "residential/houses"). Used as fallback for breadcrumbs. */
  taxonomySlugPath?: string | null;
}) {
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
      taxonomy_slug_path?: string | null;
    };
    const brand = row.brands_used?.[0]?.name?.trim() ?? null;
    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      brand: brand || null,
      thumbnail: thumbnailMap[row.id] ?? null,
      taxonomy_slug_path: row.taxonomy_slug_path ?? null,
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
  console.log("[ProjectDetail] taxNodes count:", taxNodes.length, "primaryNode:", primaryNode ? { domain: primaryNode.domain, slug_path: primaryNode.slug_path } : null, "taxonomySlugPath prop:", taxonomySlugPath);
  if (primaryNode) {
    const ancestorsRes = await getTaxonomyAncestors(primaryNode.domain, primaryNode.slug_path);
    categoryCrumbs = (ancestorsRes.data ?? []).map((n) => ({ label: n.label, slug_path: n.slug_path }));
    console.log("[ProjectDetail] breadcrumbs from primaryNode:", primaryNode.slug_path, "→", categoryCrumbs.length, "crumbs:", categoryCrumbs.map(c => c.label), "error:", ancestorsRes.error);
  } else if (taxonomySlugPath) {
    const ancestorsRes = await getTaxonomyAncestors("project", taxonomySlugPath);
    categoryCrumbs = (ancestorsRes.data ?? []).map((n) => ({ label: n.label, slug_path: n.slug_path }));
    console.log("[ProjectDetail] breadcrumbs from URL fallback:", taxonomySlugPath, "→", categoryCrumbs.length, "crumbs:", categoryCrumbs.map(c => c.label), "error:", ancestorsRes.error);
  } else {
    console.log("[ProjectDetail] NO breadcrumbs: primaryNode=null, taxonomySlugPath=null");
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

  // ── Network Discovery ──
  const ownerProfileId = project.owner?.profileId ?? null;
  const teamProfileIds = (teamWithProfiles ?? [])
    .map((m) => m.profile_id)
    .filter((id) => !id.startsWith("fallback-"));

  const projectCountry = project.location?.country?.trim() ?? null;

  const [architectProjectsResult, teamMemberProjectsResult, collaborationPairsResult, countryProjectsResult, countryDesignersResult] = await Promise.all([
    ownerProfileId
      ? getOtherProjectsByOwner(ownerProfileId, project.id)
      : Promise.resolve({ data: [], error: null }),
    getTeamMemberOtherProjects(project.id, teamProfileIds),
    getCollaborationPairs(teamProfileIds),
    projectCountry
      ? getProjectsByCountry(projectCountry, project.id, 8)
      : Promise.resolve({ data: [], error: null }),
    projectCountry
      ? getDesignersByCountry(projectCountry, 8)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const architectProjects = architectProjectsResult.data ?? [];
  const teamMemberProjectsMap = teamMemberProjectsResult.data ?? {};
  const collaborationPairs = collaborationPairsResult.data ?? [];
  const countryProjects = countryProjectsResult.data ?? [];
  const countryDesigners = countryDesignersResult.data ?? [];

  const teamMembersWithProjects = (teamWithProfiles ?? []).map((m) => ({
    profile_id: m.profile_id,
    display_name: m.display_name,
    title: m.title,
    username: m.username,
    avatar_url: null as string | null,
    projects: teamMemberProjectsMap[m.profile_id] ?? [],
  }));

  const collaborationUsernameMap: Record<string, string | null> = {};
  for (const m of teamWithProfiles ?? []) {
    collaborationUsernameMap[m.profile_id] = m.username;
  }

  const imagesWithIdsResult = await getListingImagesWithIds(project.id);
  const imagesWithIds = imagesWithIdsResult.data ?? [];
  let images: GalleryImage[];
  if (imagesWithIds.length > 0) {
    const imageIds = imagesWithIds.map((i) => i.id);

    const photoMatchesExist = await photoMatchesExistForImages(imageIds);
    if (!photoMatchesExist) {
      try {
        const { computeKeywordPhotoMatches } = await import("@/lib/matches/engine");
        const result = await computeKeywordPhotoMatches(project.id);
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[projects] lazy keyword photo_matches: project=${project.id}`,
            `upserted=${result.upserted} errors=${result.errors.length}`,
            result.errors.length ? result.errors : ""
          );
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[projects] lazy keyword photo_matches failed:", e);
        }
      }
    }

    const [tagsResult, photoMatchesResult, regionsMap] = await Promise.all([
      getPhotoProductTagsByImageIds(imageIds),
      getSelectedPhotoMatchesByImageIds(imageIds),
      getRegionsByImageIds(imageIds),
    ]);
    const tags = tagsResult.data ?? [];
    const tagsByImageId: Record<string, { id: string; x: number; y: number; product_id: string; product_title?: string; product_slug?: string; product_thumbnail?: string; product_owner_name?: string; taxonomy_slug_path?: string | null }[]> = {};
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
        taxonomy_slug_path: product?.taxonomy_slug_path ?? null,
      });
    }
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
      .map((img) => {
        // Map image_regions rows to ImageRegionMarker shape for frontend
        const rawRegions = regionsMap.get(img.id) ?? [];
        const regions = rawRegions.map((r) => {
          const candidates = Array.isArray(r.match_candidates) ? r.match_candidates : [];
          const matchedProduct = r.selected_mode === "matched" && r.matched_listing_id
            ? candidates.find((c) => c.listing_id === r.matched_listing_id) ?? null
            : null;
          return {
            id: r.id,
            label: r.label,
            object_type: r.object_type,
            keywords: Array.isArray(r.keywords) ? r.keywords : [],
            confidence: r.confidence,
            x: r.x,
            y: r.y,
            selected_mode: r.selected_mode,
            matched_product: matchedProduct ? { ...matchedProduct, score: r.match_score ?? matchedProduct.score } : null,
            similar_products: candidates.filter((c) => c.listing_id !== r.matched_listing_id),
          };
        });

        return {
          id: img.id,
          src: sanitizeListingImageUrl(img.image_url) as string,
          alt: img.alt ?? "Image",
          sort_order: img.sort_order,
          photoTags: tagsByImageId[img.id] ?? [],
          matchedProducts: matchesByImageId[img.id] ?? [],
          regions: regions.length > 0 ? regions : undefined,
        };
      });
  } else {
    images = canonicalGalleryToGalleryImages(project.gallery);
  }

  const mentionedRaw = project.mentioned_products ?? [];
  const mentionedResolved = mentionedRaw.length > 0 ? await resolveMentionedProducts(mentionedRaw) : [];

  // Prefer taxonomy-based category; fall back to legacy field
  let moreInCategory: { id: string; slug: string | null; title: string; thumbnail?: string | null; location?: string | null }[] = [];
  const taxonomySlugForCategory = primaryNode?.slug_path ?? null;
  const legacyCategoryTrim = project.category?.trim() ?? null;
  const categoryFilter = taxonomySlugForCategory
    ? { ...DEFAULT_PROJECT_FILTERS, taxonomy: taxonomySlugForCategory }
    : legacyCategoryTrim
      ? { ...DEFAULT_PROJECT_FILTERS, category: [legacyCategoryTrim] }
      : null;
  if (categoryFilter) {
    const { data: sameCat } = await getProjectsCanonicalFiltered({
      filters: categoryFilter,
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

  const currentPath = canonicalPath;
  const productsCount = usedProducts.length;
  const professionalsCount = teamWithProfiles?.length ?? 0;
  const connectionLine =
    productsCount > 0 || professionalsCount > 0
      ? `Connected to ${productsCount} product${productsCount !== 1 ? "s" : ""} and ${professionalsCount} professional${professionalsCount !== 1 ? "s" : ""}.`
      : null;
  const mapHref =
    project.location?.lat != null && project.location?.lng != null
      ? `/explore?type=projects&focus=${encodeURIComponent(project.slug ?? project.id)}`
      : null;

  const canonicalUrl = getAbsoluteUrl(canonicalPath);
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
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl("/projects") },
    ...categoryCrumbs.map((c) => ({
      name: c.label,
      url: getAbsoluteUrl(`/projects/${c.slug_path}`),
    })),
    { name: project.title, url: canonicalUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

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
        <Link href="/projects" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Projects
        </Link>
        {categoryCrumbs.map((crumb) => (
          <span key={crumb.slug_path} className="contents">
            <span aria-hidden>/</span>
            <Link
              href={`/projects/${crumb.slug_path}`}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {crumb.label}
            </Link>
          </span>
        ))}
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
        moreCategoryLabel={primaryNode?.label ?? null}
        moreCategoryHref={primaryNode ? `/projects/${primaryNode.slug_path}` : null}
        taxonomyTags={{
          categoryCrumbs,
          materialNodes: materialTaxNodes,
          facetGroups: taxonomyFacetGroups,
        }}
        architectProjects={architectProjects}
        teamMembersWithProjects={teamMembersWithProjects}
        collaborationPairs={collaborationPairs}
        collaborationUsernameMap={collaborationUsernameMap}
        countryProjects={countryProjects}
        countryDesigners={countryDesigners}
        countryName={projectCountry}
      />
    </div>
  );
}
