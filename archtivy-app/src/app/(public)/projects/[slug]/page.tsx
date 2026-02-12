import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProjectCanonicalBySlugOrId } from "@/lib/db/explore";
import { getAbsoluteUrl, getBaseUrl } from "@/lib/canonical";
import { getProductsForProject } from "@/lib/db/projectProductLinks";
import {
  getFirstImageUrlPerListingIds,
  getListingImagesWithIds,
  sanitizeListingImageUrl,
} from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getGalleryBookmarkState } from "@/app/actions/galleryBookmarks";
import { PageContainer } from "@/components/layout/PageContainer";
import { DetailLayout } from "@/components/listing/DetailLayout";
import { DetailHeaderBar } from "@/components/listing/DetailHeaderBar";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { DetailSidebar, type DetailSidebarRow } from "@/components/listing/DetailSidebar";
import { TeamMemberLinks } from "@/components/listing/TeamMemberLinks";
import { UsedOrSuggestedProductsStrip } from "@/components/listing/UsedOrSuggestedProductsStrip";
import { projectExploreUrl } from "@/lib/exploreUrls";
import { areaSqftToBucket } from "@/lib/exploreFilters";
import { connectionsLabelText } from "@/components/listing/connectionsLabel";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProjectCanonical } from "@/lib/canonical-models";
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

function buildProjectSidebarRows(
  project: ProjectCanonical,
  teamWithProfiles: ListingTeamMemberWithProfile[] | null
): DetailSidebarRow[] {
  const rows: DetailSidebarRow[] = [];

  if (project.category?.trim()) {
    rows.push({
      label: "Category",
      value: project.category.trim(),
      href: projectExploreUrl({ category: project.category }),
    });
  }

  const locationText = project.location_text?.trim() || (project.location?.city && project.location?.country
    ? `${project.location.city}, ${project.location.country}`
    : null);
  if (locationText) {
    rows.push({
      label: "Location",
      value: locationText,
      href: projectExploreUrl({
        city: project.location?.city ?? undefined,
        country: project.location?.country ?? undefined,
      }),
    });
  }

  if (project.year != null && !Number.isNaN(project.year)) {
    rows.push({
      label: "Year",
      value: String(project.year),
      href: projectExploreUrl({ year: project.year }),
    });
  }

  const areaSqft = project.area_sqft != null && !Number.isNaN(project.area_sqft) ? Math.round(project.area_sqft) : null;
  const areaSqm = project.area_sqm != null && !Number.isNaN(project.area_sqm) ? Math.round(project.area_sqm) : null;
  if (areaSqft != null || areaSqm != null) {
    const areaValue = areaSqm != null && areaSqft != null
      ? `${areaSqft} sqft (${areaSqm} sqm)`
      : areaSqft != null
        ? `${areaSqft} sqft`
        : `${areaSqm} sqm`;
    const areaBucket = areaSqft != null ? areaSqftToBucket(areaSqft) : undefined;
    rows.push({
      label: "Area",
      value: areaValue,
      href: projectExploreUrl({ area_bucket: areaBucket }),
    });
  }

  const materials = project.materials ?? [];
  if (materials.length > 0) {
    rows.push({
      label: "Materials",
      value: (
        <div className="flex flex-wrap gap-2">
          {materials.map((m) => (
            <Link
              key={m.id}
              href={projectExploreUrl({ materials: [m.slug] })}
              className="rounded-full bg-archtivy-primary/10 px-3 py-1 text-xs font-medium text-archtivy-primary transition hover:bg-archtivy-primary/15 hover:underline dark:bg-archtivy-primary/20"
            >
              {m.name}
            </Link>
          ))}
        </div>
      ),
    });
  }

  const connectionsText = connectionsLabelText(project.connectionCount);
  if (connectionsText) {
    rows.push({
      label: "Connections",
      value: connectionsText,
    });
  }

  if (teamWithProfiles && teamWithProfiles.length > 0) {
    rows.push({
      label: "Team Members",
      value: <TeamMemberLinks members={teamWithProfiles} />,
    });
  } else if (project.team_members?.length > 0) {
    const names = project.team_members
      .map((m) => (m.name?.trim() || "").replace(/\s+/g, " "))
      .filter(Boolean);
    if (names.length > 0) {
      rows.push({
        label: "Team Members",
        value: names.join(", "),
      });
    }
  }

  if (Array.isArray(project.documents) && project.documents.length > 0) {
    const count = project.documents.length;
    rows.push({
      label: "Documents",
      value: count === 1 ? "1 file" : `${count} files`,
    });
  }

  return rows;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectCanonicalBySlugOrId(slug);
  if (!project) return {};
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

  const [usedResult, isSaved, teamResult] = await Promise.all([
    getProductsForProject(project.id, { sources: ["manual", "photo_tag"] }).catch(() =>
      getProductsForProject(project.id)
    ),
    getGalleryBookmarkState("project", project.id),
    getListingTeamMembersWithProfiles(project.id),
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

  const usedItems = usedListings.map((p) => {
    const row = p as { id: string; slug?: string; title: string; description?: string | null };
    return {
      id: row.id,
      slug: row.slug ?? row.id,
      title: row.title,
      subtitle: row.description ?? null,
      thumbnail: thumbnailMap[row.id],
    };
  });

  let suggestedItems: { id: string; slug: string; title: string; thumbnail?: string | null }[] = [];
  if (usedItems.length === 0) {
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

  const relatedItems = usedItems;

  const teamWithProfiles = teamResult.data ?? null;

  const imagesWithIdsResult = await getListingImagesWithIds(project.id);
  const imagesWithIds = imagesWithIdsResult.data ?? [];
  let images: GalleryImage[];
  if (imagesWithIds.length > 0) {
    const imageIds = imagesWithIds.map((i) => i.id);
    const tagsResult = await getPhotoProductTagsByImageIds(imageIds);
    const tags = tagsResult.data ?? [];
    const productIds = Array.from(new Set(tags.map((t) => t.product_id)));
    const productMap: Record<string, { title: string; slug: string }> = {};
    if (productIds.length > 0) {
      const supabase = getSupabaseServiceClient();
      const { data: titleRows } = await supabase
        .from("listings")
        .select("id, title, slug")
        .in("id", productIds);
      for (const row of titleRows ?? []) {
        const r = row as { id: string; title: string | null; slug: string | null };
        productMap[r.id] = { title: r.title?.trim() ?? "", slug: r.slug ?? r.id };
      }
    }
    const tagsByImageId: Record<string, { x: number; y: number; product_id: string; product_title?: string; product_slug?: string }[]> = {};
    for (const t of tags) {
      if (!tagsByImageId[t.listing_image_id]) tagsByImageId[t.listing_image_id] = [];
      const info = productMap[t.product_id];
      tagsByImageId[t.listing_image_id].push({
        x: t.x,
        y: t.y,
        product_id: t.product_id,
        product_title: info?.title,
        product_slug: info?.slug,
      });
    }
    images = imagesWithIds.map((img, i) => {
      const src = sanitizeListingImageUrl(img.image_url);
      return {
        id: img.id,
        src: src ?? "",
        alt: img.alt ?? "Image",
        sort_order: img.sort_order,
        photoTags: tagsByImageId[img.id],
      };
    });
  } else {
    images = canonicalGalleryToGalleryImages(project.gallery);
  }

  const currentPath = `/projects/${project.slug ?? project.id}`;
  const sidebarRows = buildProjectSidebarRows(project, teamWithProfiles);
  const locationLine = project.location_text?.trim() || (project.location?.city && project.location?.country
    ? `${project.location.city}, ${project.location.country}`
    : null);

  return (
    <PageContainer>
      <ListingViewTracker type="project" id={project.id} />
      <nav
        className="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
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
        <span className="text-zinc-500 dark:text-zinc-400">{project.title}</span>
      </nav>

      <DetailLayout
        images={images}
        listingTitle={project.title}
        context="project"
        relatedItems={relatedItems}
        entityType="project"
        entityId={project.id}
        entitySlug={project.slug ?? project.id}
        isSaved={isSaved}
        currentPath={currentPath}
        headerBar={
          <DetailHeaderBar
            entityType="project"
            entityId={project.id}
            currentPath={currentPath}
            isSaved={isSaved}
            locationLine={locationLine ?? undefined}
            connectionCount={project.connectionCount}
          />
        }
        belowHeader={
          <UsedOrSuggestedProductsStrip
            usedItems={usedItems.length > 0 ? usedItems : null}
            suggestedItems={usedItems.length === 0 ? suggestedItems : null}
          />
        }
        title={
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-3xl">
            {project.title}
          </h1>
        }
        description={
          project.description?.trim() ? (
            <section className="prose prose-zinc dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                {project.description.trim()}
              </div>
            </section>
          ) : null
        }
        sidebar={<DetailSidebar title="Project details" rows={sidebarRows} />}
      />
    </PageContainer>
  );
}
