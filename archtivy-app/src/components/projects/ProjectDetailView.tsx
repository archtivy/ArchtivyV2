import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ExternalLink } from "lucide-react";
import { getProjectDetail } from "@/lib/db/projectDetail";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProjectGalleryWithLightbox } from "@/components/projects/ProjectGalleryWithLightbox";
import { ProjectDetailHeader } from "@/components/projects/ProjectDetailHeader";
import { ProjectHeaderActions } from "@/components/projects/ProjectHeaderActions";
import { ProjectDetailsPanel } from "@/components/projects/ProjectDetailsPanel";
import { SidebarCard } from "@/components/projects/SidebarCard";
import {
  ProjectLocationCard,
  ClaimProjectCard,
  ShareProjectCard,
} from "@/components/projects/ProjectSidebarCards";
import { ProjectTeam } from "@/components/projects/ProjectTeam";
import { ProjectDrawings } from "@/components/projects/ProjectDrawings";
import { ProjectRail } from "@/components/projects/ProjectRail";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { ProjectCollaborationSection } from "@/components/listing/CollaborationSection";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildProjectJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { getProductRailCards } from "@/lib/cards/productRailCards";
import { getProjectRailCards } from "@/lib/cards/projectRailCards";
import type { ProjectCanonical } from "@/lib/canonical-models";
import { HEADER_CLEARANCE } from "@/components/home/headerClearance";

/**
 * Project Detail.
 *
 * ── LAYOUT ──────────────────────────────────────────────────────────────────
 *   MAIN (8/12)  breadcrumb, taxonomy line, title, location + year, hero
 *                gallery with its thumbnail strip, About, The Team, Products
 *                Used, Drawings, Related Projects.
 *   SIDE (4/12)  studio card, Project Details, Location, Share, Claim.
 *
 * Below `lg` the grid collapses to one column and the sidebar falls into
 * document flow after the main content, in DOM order — the gallery stays
 * dominant and nothing is hidden.
 *
 * ── THE SIDEBAR IS A NAVIGATION SURFACE ─────────────────────────────────────
 * Project Details is not a specification table: every value with a real
 * destination is a semantic link into the taxonomy, location, material, year,
 * status or profile system. Which values those are, and which are deliberately
 * plain because nothing resolves them, is documented in ProjectDetailsPanel.
 *
 * ── CARDS ARE CANONICAL, ALWAYS ─────────────────────────────────────────────
 * Products Used and Related Projects both render ListingCardShared with the
 * FULL canonical model — taxonomy line, location, year, owner avatar,
 * relationship badge, save behaviour — resolved by getProductRailCards and
 * getProjectRailCards. The detail loader's own small product/related shapes
 * are no longer used for rendering; they supply ids and ordering only. No
 * page-specific card variant exists.
 *
 * ── NOT RENDERED, because nothing backs it ──────────────────────────────────
 *   "Featured In"   the `articles` table exists and holds ZERO rows, and
 *                   article_related_entities is empty too. A press list would
 *                   render on 0 of 53 projects.
 *   map tile        no map provider is wired anywhere in this application.
 *                   listings carries lat/lng, so it is buildable later; a
 *                   generic street graphic in the meantime is a picture of
 *                   nowhere presented as this project's surroundings.
 */
export async function ProjectDetailView({
  project,
  canonicalPath,
}: {
  project: ProjectCanonical;
  canonicalPath: string;
}) {
  const detail = await getProjectDetail(project.id);
  if (!detail) return null;

  /*
   * ONE resolve for both rails. Products and related projects are hydrated in
   * parallel, each batching its own counts internally, so the card count on
   * the page does not change the number of round trips.
   */
  const [productCards, projectCards] = await Promise.all([
    getProductRailCards(detail.products.map((p) => p.id)),
    getProjectRailCards([
      ...detail.related.map((r) => r.id),
      ...detail.studioProjectIds,
      ...(detail.nearby?.ids ?? []),
    ]),
  ]);
  const productModels = detail.products
    .map((p) => productCards.get(p.id))
    .filter(Boolean) as NonNullable<ReturnType<typeof productCards.get>>[];
  type ProjectModel = NonNullable<ReturnType<typeof projectCards.get>>;
  const toProjects = (ids: string[]) =>
    ids.map((id) => projectCards.get(id)).filter(Boolean) as ProjectModel[];

  const studioModels = toProjects(detail.studioProjectIds);
  /*
   * Each discovery rail is deduplicated against the ones above it, so a studio
   * that works in one city does not show the same four projects under three
   * headings. Order matters and follows the page: studio, then location, then
   * the category-based related rail last.
   */
  const seen = new Set(studioModels.map((m) => m.id));
  const nearbyModels = toProjects(detail.nearby?.ids ?? []).filter((m) => !seen.has(m.id));
  nearbyModels.forEach((m) => seen.add(m.id));
  const relatedModels = toProjects(detail.related.map((r) => r.id)).filter(
    (m) => !seen.has(m.id)
  );

  const canonicalUrl = getAbsoluteUrl(canonicalPath);

  /*
   * ── LIGHTBOX INPUTS, DERIVED FROM WHAT THIS PAGE ALREADY HAS ──────────────
   *
   * connectionCount is the PROJECT CARD'S definition of a connection, not a new
   * one: distinct profile-linked credits, exactly what getCreditCounts computes
   * from listing_team_members. Deduped by profile id for the same reason it is
   * there — one person credited twice is one connection. Text-only credits name
   * someone who is not on the platform, so they are not a connection to
   * anything and are excluded, which is also the homepage metric's rule.
   *
   * Credits themselves are NOT filtered that way: the sidebar shows the real
   * roles this project carries, linked where a profile exists and plain where
   * it does not. FR House carries Architect, Lighting Designer, Landscape
   * Architect and Photographer — nothing here forces an Architecture and
   * Photography pair the way the reference image happens to show.
   */
  const lightboxCredits: {
    role: string;
    name: string;
    href: string | null;
    avatarUrl: string | null;
  }[] = [];

  if (detail.architect) {
    lightboxCredits.push({
      role: "Architecture",
      name: detail.architect,
      href: detail.architectUsername
        ? `/u/${encodeURIComponent(detail.architectUsername)}`
        : null,
      avatarUrl: detail.architectAvatar,
    });
  }
  if (detail.photographer) {
    lightboxCredits.push({
      role: "Photography",
      name: detail.photographer,
      href: detail.photographerHref,
      // No avatar column for the photographer; the initials fallback in
      // Avatar() covers it, same pattern as every other credit surface.
      avatarUrl: null,
    });
  }

  /*
   * ── PRODUCTS: project_product_links, not product_tags ─────────────────────
   * Two candidate sources, and they differ: Istanbul House Design has 5 linked
   * products but only 4 publicly pinned, FR House 3 linked and 1 pinned. Links
   * is the superset — every public pin on a project is guaranteed to have a
   * link behind it (the invariant productTagLinks.ts enforces) — and it is
   * what "Explore all products used" navigates to. Counting pins instead would
   * promise 4 and then show 5 on arrival, and would report zero for the many
   * projects whose owner has linked products but never pinned any.
   *
   * productModels is used rather than detail.products.length because it is the
   * resolved, live set the destination section actually renders.
   */
  const productCount = productModels.length;

  /*
   * ── CONNECTIONS: the platform's own definition, scoped to one project ─────
   * lib/db/connectionsMetric.ts defines a connection as a discovered
   * relationship between two DISTINCT entities, over three terms:
   *   A project <-> product   project_product_links, both ends live
   *   B product <-> product   public tags whose parent is a product gallery
   *   C listing <-> person    credits carrying a real profile_id
   * Term B is structurally zero for a project. So A + C here, deduped.
   *
   * What is deliberately NOT counted, following that same file: ownership —
   * the studio behind the project and the brands behind its products. Every
   * listing has an owner by definition, so counting those is counting rows,
   * not mapped relationships. Sibling projects by the same studio are excluded
   * for the same reason: they share an owner, which is not an edge between
   * this project and them.
   *
   * Live values: FR House 3 + 6 = 9. Istanbul House Design 5 + 0 = 5.
   */
  const creditConnections = new Set(
    detail.team.map((m) => m.profileId).filter((id): id is string => Boolean(id))
  ).size;
  const connectionCount = productCount + creditConnections;

  /*
   * The arrow goes where the connections ACTUALLY are.
   *
   * Anchoring unconditionally at the team heading was a dead link on any
   * project whose connections are all products: ProjectTeam renders null on an
   * empty team, so #project-team-heading does not exist on Istanbul House
   * Design at all — 5 connections pointing at nothing. People first when there
   * are people, products otherwise, and no block at all when there is neither.
   */
  const connectionsHref =
    creditConnections > 0
      ? "#project-team-heading"
      : productCount > 0
        ? "#products-used-heading"
        : null;

  const locationLabel =
    [detail.locationCity, detail.locationCountry].filter(Boolean).join(", ") ||
    detail.location;
  const mainJsonLd = buildProjectJsonLd(project, canonicalUrl);
  const categoryHref = detail.buildingTypeSlugPath
    ? getArchiveCategoryUrl("project", detail.buildingTypeSlugPath)
    : null;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl("/projects") },
    ...(detail.buildingTypeLabel && categoryHref
      ? [{ name: detail.buildingTypeLabel, url: getAbsoluteUrl(categoryHref) }]
      : []),
    { name: detail.title, url: canonicalUrl },
  ]);

  const architectHref = detail.architectUsername ? `/u/${detail.architectUsername}` : null;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[mainJsonLd, breadcrumbJsonLd]} />
      {/* Sole source for views_count, which feeds the Dashboard's "Top
          Performing Projects" — see the note added when it was remounted. */}
      <ListingViewTracker type="project" id={detail.id} />
      <HomeNav variant="solid" />

      <div className={`mx-auto max-w-content px-4 ${HEADER_CLEARANCE} md:px-12 lg:px-24`}>
        {/* Breadcrumb and actions share the top line. The actions used to sit
            under the title as three bordered buttons, where they outweighed
            the project name; up here they frame the header instead of
            competing with it. */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <nav aria-label="Breadcrumb" className="min-w-0 font-body text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/projects" className="hover:text-ink">
            Projects
          </Link>
          {detail.buildingTypeLabel && categoryHref && (
            <>
              <span className="px-2">/</span>
              <Link href={categoryHref} className="hover:text-ink">
                {detail.buildingTypeLabel}
              </Link>
            </>
          )}
            <span className="px-2">/</span>
            <span className="text-ink">{detail.title}</span>
          </nav>

          <ProjectHeaderActions listingId={detail.id} title={detail.title} />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-10">
          {/* ── Main column ──────────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-8">
            <ProjectDetailHeader
              title={detail.title}
              locationCity={detail.locationCity}
              locationCountry={detail.locationCountry}
              locationFallback={detail.location}
              year={detail.year}
              buildingType={detail.buildingTypeLabel}
              buildingTypeHref={categoryHref}
              projectStatus={detail.projectStatus}
              collaborationStatus={detail.collaborationStatus}
            />

            <div className="mt-8">
              {/* ── The gallery, and the lightbox it opens ──────────────
                  Every value below is already resolved for this page; the
                  lightbox adds no query. `connectionsHref` is null unless the
                  project actually has profile-linked credits, because the
                  block it feeds must not render an arrow with nowhere to go. */}
              <ProjectGalleryWithLightbox
                images={detail.images}
                title={detail.title}
                listingId={detail.id}
                shareUrl={canonicalUrl}
                locationLabel={locationLabel}
                year={detail.year}
                credits={lightboxCredits}
              />
            </div>

            <section className="mt-14" aria-labelledby="about-project-heading">
              <h2
                id="about-project-heading"
                className="mb-5 font-display text-[24px] tracking-tight text-ink"
              >
                About the Project
              </h2>
              {detail.description ? (
                <div className="max-w-[68ch] space-y-4">
                  {detail.description
                    .split(/\n\s*\n/)
                    .filter((p) => p.trim())
                    .map((para, i) => (
                      <p key={i} className="font-body text-[15px] leading-[26px] text-ink/85">
                        {para.trim()}
                      </p>
                    ))}
                </div>
              ) : (
                <p className="font-body text-[14px] text-muted">No description added yet.</p>
              )}
            </section>

            {/* No "View all N team members" href is passed: there is no page
                that lists one project's credits, and inventing a route to
                satisfy the affordance would be a dead link. The rail carries
                every member, so nothing is unreachable. */}
            <ProjectTeam team={detail.team} />

            {/* ── Products Used ──────────────────────────────────────────
                Canonical product cards. `detail.products` supplies ids and
                order; every rendered field comes from the same model
                /products uses. */}
            {productModels.length > 0 && (
              <section className="mt-16" aria-labelledby="products-used-heading">
                <div className="mb-2 flex items-end justify-between gap-4">
                  <h2
                    id="products-used-heading"
                    className="font-display text-[24px] tracking-tight text-ink"
                  >
                    Products Used in This Project
                    <span className="ml-2.5 font-body text-[16px] text-muted">
                      {productModels.length}
                    </span>
                  </h2>
                  <Link
                    href="/products"
                    className="inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    View all products
                    <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
                <p className="mb-6 font-body text-[13px] text-muted">
                  Real products specified or featured in this project.
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
                  {productModels.map((m) => (
                    <ListingCardShared
                      key={m.id}
                      model={m}
                      ratio="1/1"
                      sizes="(max-width: 640px) 45vw, 22vw"
                    />
                  ))}
                </div>
              </section>
            )}

            <ProjectRail
              title={detail.architect ? `More from ${detail.architect}` : "More from this studio"}
              href={architectHref}
              linkLabel="View studio profile"
              items={studioModels}
            />

            {detail.nearby && (
              <ProjectRail
                title={`More projects in ${detail.nearby.label}`}
                href={
                  detail.nearby.level === "city"
                    ? `/projects?city=${encodeURIComponent(detail.nearby.label)}`
                    : `/projects?country=${encodeURIComponent(detail.nearby.label)}`
                }
                linkLabel={`View all in ${detail.nearby.label}`}
                items={nearbyModels}
              />
            )}

            <ProjectRail title={detail.relatedReason} items={relatedModels} />

            <ProjectDrawings documents={detail.documents} listingId={detail.id} />

            <ProjectCollaborationSection
              project_collaboration_status={detail.collaborationStatus}
              project_looking_for={detail.lookingFor}
            />
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <aside className="min-w-0 space-y-5 lg:col-span-4">
            {detail.architect && (
              <SidebarCard className="bg-stone/40">
                <div className="flex items-center gap-3.5">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-stone">
                    {detail.architectAvatar && (
                      <Image
                        src={detail.architectAvatar}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-body text-[16px] text-ink">
                      {detail.architect}
                    </span>
                    {detail.buildingTypeLabel && (
                      <span className="block truncate font-body text-[13px] text-muted">
                        {detail.buildingTypeLabel}
                      </span>
                    )}
                  </span>
                </div>

                {/* The reference's "Follow" button is not here: following is a
                    signed-in action with its own component elsewhere, and a
                    button that only prompts a sign-in is a worse first
                    impression than a link to the studio itself. */}
                {architectHref && (
                  <Link
                    href={architectHref}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 font-body text-[13px] text-cream transition-opacity hover:opacity-90"
                  >
                    View Studio Profile
                    <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                )}
              </SidebarCard>
            )}

            <ProjectDetailsPanel detail={detail} />

            <ProjectLocationCard
              city={detail.locationCity}
              country={detail.locationCountry}
              fallback={detail.location}
            />

            <ShareProjectCard title={detail.title} />

            <ClaimProjectCard href={detail.ownerClaimHref} studio={detail.architect} />
          </aside>
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}
