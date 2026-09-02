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
import { canManageListing } from "@/lib/auth/listingOwnership";
import { getListingUrl } from "@/lib/canonical";
import { fetchProjectArchive } from "@/lib/archive/fetchArchiveData";
import { archiveIntro } from "@/lib/archive/copy";
import { getProjectsDirectory } from "@/lib/db/projectsDirectory";
import { parseDirectoryState, isSearchResultUrl } from "@/lib/projects/directoryParams";
import { ProjectCategoryArchive } from "@/components/archive/ProjectCategoryArchive";
import { getListingTaxonomyPath } from "@/lib/taxonomy/resolve";
import { buildProjectDetailMetadata } from "@/app/(public)/projects/_lib/projectDetailRenderer";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

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

async function authCheckPending(project: {
  status: string;
  owner_clerk_user_id?: string | null;
  owner_profile_id?: string | null;
}) {
  if (!NON_PUBLIC_STATUSES.has(project.status)) return;
  const { userId } = await auth();
  const profileRes = await getProfileByClerkId(userId ?? "");
  const profile = profileRes.data as { is_admin?: boolean; id?: string | null } | null;
  // Both owner columns. Testing owner_clerk_user_id alone made this
  // fail CLOSED for the 118 of 129 live listings that carry only
  // owner_profile_id — their authors got a 404 previewing their OWN draft,
  // which is the one moment a draft preview exists for.
  const isOwner = canManageListing(project, userId, profile?.id ?? null);
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
  const { segments } = await params;
  const sp = await searchParams;
  /*
   * A category archive is indexable; the SAME archive with a query on it —
   * /projects/residential?q=house — is an internal search result, and there is
   * a combinatorial number of those. `noindex, follow` on any query, so the
   * archive keeps its authority and the result pages still get crawled for the
   * project links on them. The canonical stays on the clean archive path.
   * See isSearchResultUrl for why this keys on "any parameter" rather than a
   * list that a future filter could be forgotten from.
   */
  const searchRobots = isSearchResultUrl(sp)
    ? ({ index: false, follow: true } as const)
    : ({ index: true, follow: true } as const);
  if (segments.length > MAX_SEGMENTS) return {};

  const listingSlug = segments[segments.length - 1];

  // Try full path as archive
  if (segments.length === 1) {
    const archiveData = await fetchProjectArchive(segments[0]);
    if (archiveData) {
      const { node } = archiveData;
      return {
        title: node.seo_title || `${node.label} Projects | Archtivy`,
        description: archiveIntro("project", node),
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: searchRobots,
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  if (segments.length >= 2) {
    const fullSlug = segments.join("/");
    const archiveData = await fetchProjectArchive(fullSlug);
    if (archiveData) {
      const { node } = archiveData;
      return {
        title: node.seo_title || `${node.label} Projects | Archtivy`,
        description: archiveIntro("project", node),
        alternates: { canonical: `/projects/${node.slug_path}` },
        robots: searchRobots,
        ...(node.featured_image ? { openGraph: { images: [node.featured_image] } } : {}),
      };
    }
  }

  // Detail page metadata
  const project = await findProject(listingSlug);
  if (!project) return {};
  // Non-public rows never emit real metadata — a draft must not leak its
  // title, description or OG image to a crawler or a link unfurler.
  if (NON_PUBLIC_STATUSES.has(project.status)) return { title: "Project", robots: { index: false, follow: false } };
  const { path: canonicalPath } = await resolveCanonicalPath(project.id, project.slug ?? project.id);
  return buildProjectDetailMetadata(project, canonicalPath);
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ProjectSegmentsPage({
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
  const fullArchive = await fetchProjectArchive(fullSlugPath);
  if (fullArchive) {
    /*
     * The archive keeps its taxonomy node — title, intro, breadcrumb,
     * subcategory links, JSON-LD — and hands the RESULTS to the same directory
     * body /projects renders, scoped to this node's slug_path. `page` is no
     * longer read: the directory ships the whole set and reveals it with Load
     * more, so there is nothing left for a page number to address.
     */
    const directory = await getProjectsDirectory();
    const state = parseDirectoryState(
      new URLSearchParams(
        Object.entries(sp).flatMap(([k, v]) =>
          v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]]
        )
      )
    );
    return (
      <ProjectCategoryArchive
        node={fullArchive.node}
        ancestors={fullArchive.ancestors}
        childNodes={fullArchive.childNodes}
        siblingNodes={fullArchive.siblingNodes}
        directory={directory}
        state={state}
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

  // Cream editorial detail page (Entity Detail Layout archetype). The previous
  // renderer remains at _lib/projectDetailRenderer.tsx and still supplies
  // buildProjectDetailMetadata() above, so metadata behaviour is unchanged.
  return <ProjectDetailView project={project} canonicalPath={effectiveCanonical} />;
}
