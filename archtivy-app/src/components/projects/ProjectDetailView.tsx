import Link from "next/link";
import { getProjectDetail } from "@/lib/db/projectDetail";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Gallery } from "@/components/entity/Gallery";
import {
  UsedInProjectPanel,
  DetailsPanel,
  RelatedPanel,
} from "@/components/entity/RelationshipRail";
import { ProjectDetailHeader } from "@/components/projects/ProjectDetailHeader";
import { ProjectDetailTabs } from "@/components/projects/ProjectDetailTabs";
import { ProjectCollaborationSection } from "@/components/listing/CollaborationSection";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildProjectJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import type { ProjectCanonical } from "@/lib/canonical-models";

/**
 * Project Detail — Entity Detail Layout archetype (Blueprint §8):
 * hero gallery + tabbed sub-navigation + persistent right-hand Relationship
 * Rail.
 *
 * Renders its own HomeNav/HomeFooter on the cream palette. SiteShell treats
 * everything under /projects/* as shell-less because only the server branch can
 * distinguish a detail page from a category archive; the archive component
 * re-adds the standard shell for itself.
 *
 * Relationship Rail placement, per the responsive notes:
 *   desktop  right column, beside the tab content
 *   tablet   below the tab content
 *   mobile   below the tab content, as a plain stack — never removed
 * Achieved with grid ordering rather than a second markup tree.
 */

const NUMBER = new Intl.NumberFormat("en-US");

export async function ProjectDetailView({
  project,
  canonicalPath,
}: {
  project: ProjectCanonical;
  canonicalPath: string;
}) {
  const detail = await getProjectDetail(project.id);
  if (!detail) return null;

  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const mainJsonLd = buildProjectJsonLd(project, canonicalUrl);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl("/projects") },
    { name: detail.title, url: canonicalUrl },
  ]);

  // Every row omitted when its field is null — no "—" placeholders.
  const detailRows: { label: string; value: string }[] = [];
  if (detail.location) detailRows.push({ label: "Location", value: detail.location });
  if (detail.year) detailRows.push({ label: "Completion Year", value: String(detail.year) });
  // ft², matching the Projects Index decision: area_sqm is 0/50 populated.
  // Values <= 100 are placeholder junk and are suppressed rather than shown.
  if (detail.areaSqft && detail.areaSqft > 100) {
    detailRows.push({ label: "Gross Floor Area", value: `${NUMBER.format(detail.areaSqft)} ft²` });
  }
  if (detail.buildingTypeLabel)
    detailRows.push({ label: "Category", value: detail.buildingTypeLabel });
  if (detail.styleLabel)
    detailRows.push({ label: "Architectural Style", value: detail.styleLabel });
  if (detail.architect) detailRows.push({ label: "Studio", value: detail.architect });
  if (detail.photographer)
    detailRows.push({ label: "Photography", value: detail.photographer });

  const architectHref = detail.architectUsername ? `/u/${detail.architectUsername}` : null;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[mainJsonLd, breadcrumbJsonLd]} />
      {/* Remounted here when this view replaced _lib/projectDetailRenderer.tsx.
          The tracker only lived in that renderer, so moving to this view left
          /api/track-view with no caller and views_count stuck at 0 platform-wide.
          It is the sole source for the Dashboard's "Top Performing Projects". */}
      <ListingViewTracker type="project" id={detail.id} />
      {/* solid: no dark overlay hero on this page. */}
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <nav aria-label="Breadcrumb" className="mb-6 font-body text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/projects" className="hover:text-ink">
            Projects
          </Link>
          <span className="px-2">/</span>
          <span className="text-ink">{detail.title}</span>
        </nav>

        <ProjectDetailHeader
          listingId={detail.id}
          title={detail.title}
          location={detail.location}
          architect={detail.architect}
          architectHref={architectHref}
          year={detail.year}
          buildingType={detail.buildingTypeLabel}
        projectStatus={detail.projectStatus}
        collaborationStatus={detail.collaborationStatus}
        />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <Gallery images={detail.images} title={detail.title} />
            <ProjectDetailTabs project={detail} />

            <ProjectCollaborationSection
              project_collaboration_status={detail.collaborationStatus}
              project_looking_for={detail.lookingFor}
            />
          </div>

          <aside className="min-w-0 space-y-5 lg:col-span-4">
            <UsedInProjectPanel
              products={detail.products.slice(0, 5)}
              total={detail.products.length}
              productsHref="/products"
            />
            <DetailsPanel rows={detailRows} />
            <RelatedPanel items={detail.related} reason={detail.relatedReason} />
          </aside>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}
