// ISR: data cache revalidates every hour; admin mutations bust it immediately via
// revalidatePath + revalidateTag(CACHE_TAGS.listings).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProjectCanonicalBySlugOrId } from "@/lib/db/explore";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getListingUrl } from "@/lib/canonical";
import { fetchProjectArchive } from "@/lib/archive/fetchArchiveData";
import { ProjectCategoryArchive } from "@/components/archive/ProjectCategoryArchive";
import { getListingTaxonomyPath } from "@/lib/taxonomy/resolve";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";
import {
  ProjectDetailRenderer,
  buildProjectDetailMetadata,
} from "@/app/(public)/projects/_lib/projectDetailRenderer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Per-slug cached project fetch; busted by revalidateTag(CACHE_TAGS.listings). */
function getCachedProject(slug: string) {
  return unstable_cache(
    () => getProjectCanonicalBySlugOrId(slug),
    [`project:canonical:${slug}`],
    { tags: [CACHE_TAGS.listings, CACHE_TAGS.matches, `project:${slug}`], revalidate: 3600 }
  )();
}

/**
 * Resolve the canonical detail path for a project.
 * Returns the taxonomy-aware path or falls back to flat slug.
 */
async function resolveCanonicalPath(
  projectId: string,
  slug: string
): Promise<string> {
  const taxPath = await getListingTaxonomyPath(projectId);
  if (taxPath.primary) {
    return getListingUrl({
      id: projectId,
      type: "project",
      slug,
      taxonomySlugPath: taxPath.primary.slug_path,
    });
  }
  return `/projects/${slug}`;
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { segments } = await params;
  if (segments.length > 3) return {};

  // 1-segment: archive check → detail metadata
  if (segments.length === 1) {
    const [slug] = segments;
    const archiveData = await fetchProjectArchive(slug);
    if (archiveData) {
      const { node } = archiveData;
      const title = node.seo_title || `${node.label} Projects | Archtivy`;
      const description =
        node.meta_description ||
        node.description ||
        `Browse ${node.label.toLowerCase()} architecture projects on Archtivy.`;
      return {
        title,
        description,
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
    const project = await getCachedProject(slug);
    if (!project) return {};
    if (project.status === "PENDING") return { title: "Project" };
    const canonicalPath = await resolveCanonicalPath(project.id, project.slug ?? project.id);
    return buildProjectDetailMetadata(project, canonicalPath);
  }

  // 2-segment: subcategory archive check → detail metadata (listing under 1-level taxonomy)
  if (segments.length === 2) {
    const [cat, slugOrSub] = segments;
    const slugPath = `${cat}/${slugOrSub}`;
    const archiveData = await fetchProjectArchive(slugPath);
    if (archiveData) {
      const { node } = archiveData;
      const title = node.seo_title || `${node.label} Projects | Archtivy`;
      const description =
        node.meta_description ||
        node.description ||
        `Browse ${node.label.toLowerCase()} architecture projects on Archtivy.`;
      return {
        title,
        description,
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: { index: true, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
    // Could be detail: /projects/{category}/{listing-slug}
    const project = await getCachedProject(slugOrSub);
    if (!project) return {};
    if (project.status === "PENDING") return { title: "Project" };
    return buildProjectDetailMetadata(project, `/projects/${cat}/${project.slug ?? project.id}`);
  }

  // 3-segment: canonical detail: /projects/{category}/{subcategory}/{listing-slug}
  if (segments.length === 3) {
    const [, , listingSlug] = segments;
    const project = await getCachedProject(listingSlug);
    if (!project) return {};
    if (project.status === "PENDING") return { title: "Project" };
    const canonicalPath = await resolveCanonicalPath(project.id, project.slug ?? project.id);
    return buildProjectDetailMetadata(project, canonicalPath);
  }

  return {};
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProjectSegmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { segments } = await params;
  const { page: pageParam } = await searchParams;

  if (segments.length > 3) notFound();

  // ── 1 segment: /projects/{slug} ──
  // Could be: category archive OR legacy detail (with redirect to canonical)
  if (segments.length === 1) {
    const [slug] = segments;

    // Archive check
    const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
    const archiveData = await fetchProjectArchive(slug, pageNum);
    if (archiveData) {
      return (
        <ProjectCategoryArchive
          node={archiveData.node}
          ancestors={archiveData.ancestors}
          childNodes={archiveData.childNodes}
          listings={archiveData.listings}
          total={archiveData.total}
          page={archiveData.page}
          totalPages={archiveData.totalPages}
        />
      );
    }

    // Detail page
    const project = await getCachedProject(slug);
    if (!project) notFound();

    // UUID → slug redirect
    if (UUID_RE.test(slug) && project.slug && project.slug !== slug) {
      const canonical = await resolveCanonicalPath(project.id, project.slug);
      permanentRedirect(canonical);
    }

    // Auth check for PENDING
    if (project.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    // Redirect to canonical taxonomy-aware URL if taxonomy exists
    const taxPath = await getListingTaxonomyPath(project.id);
    if (taxPath.primary && project.slug) {
      const canonical = getListingUrl({
        id: project.id,
        type: "project",
        slug: project.slug,
        taxonomySlugPath: taxPath.primary.slug_path,
      });
      permanentRedirect(canonical);
    }

    // Fallback: no taxonomy, render at flat URL
    const canonicalPath = `/projects/${project.slug ?? project.id}`;
    return <ProjectDetailRenderer project={project} canonicalPath={canonicalPath} />;
  }

  // ── 2 segments: /projects/{cat}/{slugOrSub} ──
  // Could be: subcategory archive OR detail under 1-level taxonomy
  if (segments.length === 2) {
    const [cat, slugOrSub] = segments;
    const slugPath = `${cat}/${slugOrSub}`;

    // Archive check
    const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
    const archiveData = await fetchProjectArchive(slugPath, pageNum);
    if (archiveData) {
      return (
        <ProjectCategoryArchive
          node={archiveData.node}
          ancestors={archiveData.ancestors}
          childNodes={archiveData.childNodes}
          listings={archiveData.listings}
          total={archiveData.total}
          page={archiveData.page}
          totalPages={archiveData.totalPages}
        />
      );
    }

    // Detail page: slugOrSub is a listing slug under category `cat`
    const project = await getCachedProject(slugOrSub);
    if (!project) notFound();

    // Verify the category segment matches this listing's taxonomy
    const taxPath = await getListingTaxonomyPath(project.id);
    const canonicalPath = await resolveCanonicalPath(project.id, project.slug ?? project.id);

    // Auth check for PENDING
    if (project.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    // If the URL doesn't match the canonical path, redirect
    const currentUrlPath = `/projects/${cat}/${project.slug ?? project.id}`;
    if (canonicalPath !== currentUrlPath) {
      permanentRedirect(canonicalPath);
    }

    // Verify category matches: the listing's category slug should match `cat`
    if (taxPath.category && taxPath.category.slug !== cat) {
      permanentRedirect(canonicalPath);
    }

    // Listing is under a 1-level taxonomy and URL matches
    return <ProjectDetailRenderer project={project} canonicalPath={canonicalPath} />;
  }

  // ── 3 segments: /projects/{cat}/{subcat}/{listingSlug} ──
  // Canonical detail under 2-level taxonomy
  if (segments.length === 3) {
    const [cat, subcat, listingSlug] = segments;

    const project = await getCachedProject(listingSlug);
    if (!project) notFound();

    // Auth check for PENDING
    if (project.status === "PENDING") {
      const { userId } = await auth();
      const profileRes = await getProfileByClerkId(userId ?? "");
      const profile = profileRes.data as { is_admin?: boolean } | null;
      const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
      const isAdmin = Boolean(profile?.is_admin);
      if (!isOwner && !isAdmin) notFound();
    }

    // Resolve the listing's actual canonical path
    const canonicalPath = await resolveCanonicalPath(project.id, project.slug ?? project.id);

    // If the URL doesn't match the canonical, redirect
    const currentUrlPath = `/projects/${cat}/${subcat}/${project.slug ?? project.id}`;
    if (canonicalPath !== currentUrlPath) {
      permanentRedirect(canonicalPath);
    }

    return <ProjectDetailRenderer project={project} canonicalPath={canonicalPath} />;
  }

  notFound();
}
