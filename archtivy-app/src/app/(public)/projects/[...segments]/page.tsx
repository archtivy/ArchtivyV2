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
import {
  ProjectDetailRenderer,
  buildProjectDetailMetadata,
} from "@/app/(public)/projects/_lib/projectDetailRenderer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Max taxonomy depth (category/subcategory) + 1 listing slug = 3 segments for projects. */
const MAX_SEGMENTS = 3;

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
 * Returns { path, hasTaxonomy } so callers know whether taxonomy was resolved.
 */
async function resolveCanonicalPath(
  projectId: string,
  slug: string
): Promise<{ path: string; hasTaxonomy: boolean }> {
  const taxPath = await getListingTaxonomyPath(projectId);
  if (taxPath.primary) {
    return {
      path: getListingUrl({
        id: projectId,
        type: "project",
        slug,
        taxonomySlugPath: taxPath.primary.slug_path,
      }),
      hasTaxonomy: true,
    };
  }
  return { path: `/projects/${slug}`, hasTaxonomy: false };
}

async function findProject(slug: string) {
  return getCachedProject(slug);
}

async function authCheckPending(project: { status: string; owner_clerk_user_id?: string | null }) {
  if (project.status !== "PENDING") return;
  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean } | null;
  const isOwner = Boolean(userId && project.owner_clerk_user_id === userId);
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
    const archiveData = await fetchProjectArchive(segments[0]);
    if (archiveData) {
      const { node, total } = archiveData;
      return {
        title: node.seo_title || `${node.label} Projects | Archtivy`,
        description: node.meta_description || node.description || `Browse ${node.label.toLowerCase()} architecture projects on Archtivy.`,
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: { index: total > 0, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  if (segments.length >= 2) {
    const fullSlug = segments.join("/");
    const archiveData = await fetchProjectArchive(fullSlug);
    if (archiveData) {
      const { node, total } = archiveData;
      return {
        title: node.seo_title || `${node.label} Projects | Archtivy`,
        description: node.meta_description || node.description || `Browse ${node.label.toLowerCase()} architecture projects on Archtivy.`,
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: { index: total > 0, follow: true },
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  // Detail page metadata
  const project = await findProject(listingSlug);
  if (!project) return {};
  if (project.status === "PENDING") return { title: "Project" };
  const { path: canonicalPath } = await resolveCanonicalPath(project.id, project.slug ?? project.id);
  return buildProjectDetailMetadata(project, canonicalPath);
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

  if (segments.length > MAX_SEGMENTS) notFound();

  // ── Try as archive page first ──────────────────────────────────────────
  const fullSlugPath = segments.join("/");
  const pageNum = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const fullArchive = await fetchProjectArchive(fullSlugPath, pageNum);
  if (fullArchive) {
    return (
      <ProjectCategoryArchive
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

  const project = await findProject(listingSlug);
  if (!project) notFound();

  // UUID → slug redirect
  if (UUID_RE.test(listingSlug) && project.slug && project.slug !== listingSlug) {
    const { path: canonical } = await resolveCanonicalPath(project.id, project.slug);
    permanentRedirect(canonical);
  }

  await authCheckPending(project);

  // Resolve canonical URL
  const { path: canonicalPath, hasTaxonomy } = await resolveCanonicalPath(
    project.id,
    project.slug ?? project.id,
  );
  const currentUrlPath = `/projects/${segments.join("/")}`;

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

  return <ProjectDetailRenderer project={project} canonicalPath={effectiveCanonical} taxonomySlugPath={taxonomyPrefix} />;
}
