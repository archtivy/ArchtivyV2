/**
 * Project detail SEO metadata.
 *
 * ── THIS FILE USED TO RENDER THE PAGE ───────────────────────────────────────
 * It was the project detail renderer. ProjectDetailView replaced it, and the
 * ~400-line ProjectDetailRenderer left behind had zero consumers — while still
 * being the last public-side reader of the retired photo_product_tags table.
 * It is gone; only the pure metadata builder the route actually imports stays,
 * so the page's metadata behaviour is unchanged.
 */

import { getAbsoluteUrl } from "@/lib/canonical";
import type { ProjectCanonical } from "@/lib/canonical-models";
import {
  buildProjectSeoTitle,
  buildProjectMetaDescription,
  extractMaterialNames,
  type ProjectSeoInput,
} from "@/lib/seo/seo-templates";

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

/*
 * ── ProjectDetailRenderer WAS HERE, AND WAS DEAD ────────────────────────────
 *
 * ~400 lines with zero consumers. The live project page is ProjectDetailView,
 * which resolves hotspots through getProjectDetail -> getHotspotsForListing,
 * i.e. product_tags. This renderer was the only thing left in the codebase
 * reading photo_product_tags on the public side, and it read it into a page
 * nobody could reach.
 *
 * Removed with the table rather than repointed: maintaining a corpse against a
 * new schema is worse than deleting it, and the same call was made for
 * getFeaturedProducts when the orphaned-sidecar path went.
 *
 * buildProjectDetailMetadata above stays — the route still imports it, so the
 * page's metadata behaviour is untouched.
 */
