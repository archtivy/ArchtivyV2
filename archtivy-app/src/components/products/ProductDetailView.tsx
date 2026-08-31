import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getProductDetail } from "@/lib/db/productDetail";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProductGalleryWithLightbox } from "@/components/products/ProductGalleryWithLightbox";
import { RailPanel } from "@/components/entity/RelationshipRail";
import { SaveToggle } from "@/components/home/SaveToggle";
import { normaliseExternalUrl } from "@/lib/url/externalUrl";
import { ProductStageBadge, CollaborationBadge } from "@/components/listing/StatusBadge";
import { ProductCollaborationSection } from "@/components/listing/CollaborationSection";
import { RequestQuoteButton } from "@/components/products/RequestQuoteButton";
import { ProductAbout } from "@/components/products/ProductAbout";
import { ProductDownloads } from "@/components/products/ProductDownloads";
import { SeenInProjects } from "@/components/products/SeenInProjects";
import { OftenSpecifiedWith } from "@/components/products/OftenSpecifiedWith";
import { ProductRail } from "@/components/products/ProductRail";
import { getOftenSpecifiedWith } from "@/lib/db/oftenSpecifiedWith";
import { getProductRailCards } from "@/lib/cards/productRailCards";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import type { ProductCanonical } from "@/lib/canonical-models";

/**
 * Product Detail — Entity Detail Layout archetype (Blueprint §8).
 *
 * ── LAYOUT ──────────────────────────────────────────────────────────────────
 * Two columns, one grid row:
 *
 *   LEFT (7/12)  gallery in row 1, the About / Details / Downloads tabs in
 *                row 2. The scrolling content: arbitrarily tall, and what
 *                sets the height the sticky column travels along.
 *   RIGHT (5/12) title, actions, specification, the brand card and the
 *                downloads, as ONE sticky block spanning both rows, pinned
 *                below the fixed 72px header.
 *
 * Below both, full width: Seen in Projects and the product rails.
 *
 * ── WHY THREE GRID ITEMS AND NOT TWO ────────────────────────────────────────
 * Gallery and tabs are separate items placed into column 1 explicitly, rather
 * than nested inside one left-hand column. Nesting is tidier CSS and wrong on
 * a phone: below `lg` the grid is a single column that renders in DOM order,
 * so a combined left column would have put the whole description between the
 * gallery and the product title. Keeping them separate makes the mobile order
 * gallery -> title, actions, specification, brand -> description, which is the
 * order the page is read in.
 *
 * The point of the sticky column is that what you decide on — the name, the
 * price-request buttons, the specification, the brand — stays in view while
 * the photographs and the description scroll past it. It is one block rather
 * than two so the brand card cannot drift away from the specification it
 * belongs to.
 *
 * It releases without any JavaScript: a sticky element travels only inside its
 * containing block, and that is its grid area, which ends with the row. The
 * rails below are outside the grid, so the sidebar cannot reach them. On a
 * product whose description is short enough that the right column is the
 * taller of the two, there is nothing to travel along and it simply never
 * sticks — also correct.
 *
 * GALLERY: horizontal thumbnail strip below the hero, the same orientation
 * every other caller uses. A vertical side rail was tried and removed —
 * stacked thumbnails are taller than the photograph they belong to, which
 * needed absolute positioning inside a flex track to stop the rail setting the
 * row height. A strip below has no such failure mode, and the prop and that
 * machinery are gone rather than left behind unused.
 *
 * NOT RENDERED, because nothing backs them (see lib/db/productDetail.ts):
 *   "Verified Product" badge   no verification column anywhere
 *   ratings / review count     no reviews table
 *   affiliate disclosure       no affiliate program or link data
 *   brand follower count       REMOVED — `follows` holds 9 rows platform-wide,
 *                              none product-related; the mockup's "3.2k" was
 *                              decoration
 *   save count                 saves_count is 0 on all 80 live products
 *   "Verified Product" badge   no verification column exists on products or
 *                              profiles; claim_status is the profile-claim
 *                              workflow, not a product attestation. The blue
 *                              check beside the brand name goes for the same
 *                              reason.
 *   finish / colour swatches   products.color_options is populated on 2 of 80,
 *                              and holds bare strings with no hex or swatch
 *                              image to render
 *   Q&A tab                    no questions/answers tables anywhere
 *   "Made In"                  no such column; listings.location_country is
 *                              null on all 80 products and a brand's HQ is not
 *                              a manufacturing origin
 *   document groupings         listing_documents has no colour, finish or
 *                              category column. file_type is a MIME string
 *                              with two values across all 60 product files,
 *                              and size_bytes is null on every row, so the
 *                              download list is flat and tagged by format
 *   "Collection"               no column, no taxonomy domain, no facet. The
 *                              `collections` table is the Inspiration
 *                              saved-query construct, not a product line
 *   brand founding year        the mockup's "Italy - 1934" -- profiles has no
 *                              founding-year column, and Molteni&C carries
 *                              neither a city nor a country, so both halves of
 *                              that line were invented
 *   price                      no price column on products or listings; every
 *                              figure in the mockup was invented
 */
export async function ProductDetailView({
  product,
  canonicalPath,
}: {
  product: ProductCanonical;
  canonicalPath: string;
}) {
  const detail = await getProductDetail(product.id);
  if (!detail) return null;

  // Fetched here rather than passed in: this component already owns its own
  // data fetching, and the module is self-suppressing when it finds nothing.
  const oftenSpecifiedWith = await getOftenSpecifiedWith(product.id);

  /*
   * The related rail is deduplicated against the two rows above it before the
   * cards are resolved, so the hydrator is never asked for a product that will
   * not be rendered. `related` and the fallback tier of "Often specified with"
   * are both same-category queries and return substantially the same products
   * on a listing with no co-occurrence data.
   */
  const relatedItems = detail.related.filter(
    (r) =>
      !oftenSpecifiedWith.some((o) => o.id === r.id) &&
      !(detail.brand?.otherProducts ?? []).some((b) => b.id === r.id)
  );

  /*
   * ONE call for every rail on the page. The three sections render the same
   * canonical card the products directory does — category, sub-type, brand
   * logo chip, relationship badge — and resolving those fields per rail, or
   * per card, would undo the batching getCardBadgeCounts exists for. Four
   * round trips total, whatever the card count.
   */
  const railCards = await getProductRailCards([
    ...oftenSpecifiedWith.map((i) => i.id),
    ...(detail.brand?.otherProducts ?? []).map((i) => i.id),
    ...relatedItems.map((i) => i.id),
  ]);
  const toModels = (ids: { id: string }[]) =>
    ids.map((i) => railCards.get(i.id)).filter(Boolean) as NonNullable<
      ReturnType<typeof railCards.get>
    >[];

  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const brandHrefAbs = detail.brand?.username
    ? getAbsoluteUrl(`/u/${detail.brand.username}`)
    : null;
  const mainJsonLd = buildProductJsonLd(
    product,
    detail.brand?.name ?? null,
    brandHrefAbs,
    canonicalUrl
  );
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: getAbsoluteUrl("/products") },
    ...(detail.categoryLabel && detail.categoryRoot
      ? [
          {
            name: detail.categoryLabel,
            url: getAbsoluteUrl(`/products/${detail.categoryRoot}`),
          },
        ]
      : []),
    { name: detail.title, url: canonicalUrl },
  ]);

  const brandHref = detail.brand?.username ? `/u/${detail.brand.username}` : null;

  /*
   * Two different destinations were both being called "Visit Official Website".
   *
   * The button read detail.brand.website — the brand's HOMEPAGE, off profiles —
   * while the publish wizard writes the product's own URL to listings.website
   * (its placeholder is literally "https://example.com/products/nena"). The
   * product's own link was never read, so the label promised a product page and
   * delivered a company homepage.
   *
   * The product's page is the more specific answer, so it wins; the brand
   * homepage stays as the fallback. The label names whichever one is being
   * used, because "Official Website" describes both and distinguishes neither.
   *
   * Both go through normaliseExternalUrl, which returns null for anything it
   * cannot make into a safe absolute URL — so a value like "archtivy.com" stops
   * resolving as a relative path (the actual 404), and the button declines to
   * render rather than promising a destination it cannot reach.
   */
  const productSite = normaliseExternalUrl(detail.website);
  const brandSite = normaliseExternalUrl(detail.brand?.website);
  const externalSite = productSite
    ? { href: productSite, label: "Visit Product Website" }
    : brandSite
      ? { href: brandSite, label: "Visit Brand Website" }
      : null;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[mainJsonLd, breadcrumbJsonLd]} />
      {/* See the matching note in ProjectDetailView: the tracker was orphaned
          in _lib/productDetailRenderer.tsx when this view replaced it. */}
      <ListingViewTracker type="product" id={detail.id} />
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <nav aria-label="Breadcrumb" className="mb-6 font-body text-[12px] text-muted">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <span className="px-2">/</span>
          <Link href="/products" className="hover:text-ink">
            Products
          </Link>
          {detail.categoryLabel && detail.categoryRoot && (
            <>
              <span className="px-2">/</span>
              <Link href={`/products/${detail.categoryRoot}`} className="hover:text-ink">
                {detail.categoryLabel}
              </Link>
            </>
          )}
          <span className="px-2">/</span>
          <span className="text-ink">{detail.title}</span>
        </nav>

        {/* Two items per row on desktop, both rows sharing one 12-column grid:
            gallery + product information, then tabs + brand card. Keeping them
            in a single grid rather than two stacked flex rows means the tabs
            column lines up under the gallery and the brand card under the
            specification, with no second set of width values to keep in sync. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* ── Gallery ─────────────────────────────────────────────────
              Column 1, row 1. */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1 lg:col-span-7">
            {/* ── The gallery, and the lightbox it opens ────────────────
                Every value is already resolved for this page; the lightbox
                adds no query. Each sidebar row is self-omitting, so a product
                with no materials, dimensions or designer simply renders a
                shorter card — see ProductLightbox for the measured coverage
                behind that decision. */}
            <ProductGalleryWithLightbox
              images={detail.images}
              title={detail.title}
              listingId={detail.id}
              shareUrl={canonicalUrl}
              brandName={detail.brand?.name ?? null}
              brandHref={brandHref}
              brandAvatarUrl={detail.brand?.avatarUrl ?? null}
              brandLocation={detail.brand?.location ?? null}
              year={detail.year}
              categoryLabel={detail.categoryLabel}
              categoryHref={
                detail.categoryLabel && detail.categoryRoot
                  ? `/products/${detail.categoryRoot}`
                  : null
              }
              designers={detail.designers.map((d) => ({
                name: d.name,
                // 37 of 38 credited profiles are unclaimed stubs with no /u/
                // route, so the row links only where one actually resolves.
                href: d.username ? `/u/${encodeURIComponent(d.username)}` : null,
              }))}
              materials={detail.materials}
              dimensions={detail.dimensions}
              colors={detail.colorOptions}
              projectCount={detail.projects.length}
              projects={detail.projects.map((pr) => ({
                id: pr.id,
                title: pr.title,
                href: pr.href,
                cover: pr.cover,
              }))}
              projectsHref={detail.projects.length > 0 ? "#seen-in-projects" : null}
              brandProducts={(detail.brand?.otherProducts ?? []).map((pr) => ({
                id: pr.id,
                title: pr.title,
                href: pr.href,
                cover: pr.cover,
              }))}
              brandProductsHref={
                (detail.brand?.otherProducts?.length ?? 0) > 0 ? "#more-from-brand" : null
              }
            />
          </div>

          {/* ── Right column: one sticky unit ─────────────────────────────
              Title, actions, specification and the brand card are a single
              sticky block, so the information you decide on stays in view
              while the gallery and the description scroll past it.

              WHY IT RELEASES ON ITS OWN: a sticky element travels only within
              its containing block, which here is its grid area. The area ends
              where the grid row ends, so the block unpins at the bottom of the
              row and cannot reach — let alone overlap — the full-width rails
              that follow the grid. No scroll listener, no fixed positioning.

              `lg:items-start` on the grid is load-bearing: the default
              `stretch` would make this item as tall as the row, leaving it
              nothing to travel along and no visible stick at all.

              The max-height guard is for short viewports. Pinned at 88px, a
              tall sidebar on a 768px-high laptop would put its last spec rows
              permanently below the fold with no way to reach them; capping it
              to the remaining viewport height lets it scroll internally in
              that case, and does nothing at all when it fits. */}
          <div className="min-w-0 lg:sticky lg:top-[88px] lg:col-start-8 lg:row-start-1 lg:col-span-5 lg:row-span-2 lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto">
            <div>
              {/* Brand line. No verification checkmark: no verification flag
                  exists on any table, and brand claim_status is 'unclaimed'
                  for all 15 brands. */}
              {detail.brand && (
                <p className="font-body text-[12px] uppercase tracking-[0.1em] text-muted">
                  {brandHref ? (
                    <Link href={brandHref} className="hover:text-ink">
                      {detail.brand.name}
                    </Link>
                  ) : (
                    detail.brand.name
                  )}
                </p>
              )}

              <h1 className="mt-2 font-display text-[32px] leading-[1.1] tracking-[-0.02em] text-ink sm:text-[40px]">
                {detail.title}
              </h1>

              {/* Lifecycle badges. Render nothing at all when the product is
                  in its ordinary state — see StatusBadge. */}
              <div className="mt-3 flex flex-wrap gap-2 empty:mt-0">
                <ProductStageBadge stage={detail.productStage} />
                <CollaborationBadge status={detail.collaborationStatus} kind="product" />
              </div>

              {detail.subtitle && (
                <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[24px] text-muted">
                  {detail.subtitle}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <SaveToggle
                  listingId={detail.id}
                  entityType="product"
                  entityTitle={detail.title}
                  variant="inline"
                />

                {externalSite && (
                  <a
                    href={externalSite.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
                  >
                    {externalSite.label}
                    <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}

                <RequestQuoteButton listingId={detail.id} listingTitle={detail.title} />
              </div>

              {/* Finish / Colour swatches are gone. products.color_options is
                  populated on 2 of 80 products and holds bare strings — no hex,
                  no swatch image — so the mockup's three circles had nothing
                  behind them and the row was absent on 97.5% of pages anyway. */}

              {/* ── Specification table ───────────────────────────────────
                  Every row is independently real-or-omitted, the same rule the
                  lifecycle badges follow. Coverage across 80 live products:
                  category 69, materials 22 (product_material_links, the
                  canonical source), dimensions 16. Rows the mockup showed that
                  have NO column behind them — Style, Made In, price — are not
                  here at all rather than rendered empty. */}
              <SpecTable
                rows={[
                  detail.categoryLabel && detail.categoryRoot
                    ? {
                        label: "Category",
                        value: detail.categoryLabel,
                        href: `/products/${detail.categoryRoot}`,
                      }
                    : null,
                  /* Type and Style arrive from the retired "Details" tab.
                     Type is the primary taxonomy node and is already nulled
                     upstream when it IS the category root, so the two rows can
                     never restate one node. Style is a taxonomy node too, real
                     on 8 of 80 products. Everything else the tab printed —
                     Category, Materials, Dimensions, Year — was already here,
                     and its "Made in" row was removed outright: it read the
                     brand's HQ address as a manufacturing origin. */
                  detail.typeLabel ? { label: "Type", value: detail.typeLabel } : null,
                  detail.styleLabel ? { label: "Style", value: detail.styleLabel } : null,
                  detail.materials.length > 0
                    ? { label: "Materials", value: detail.materials.join(", ") }
                    : null,
                  detail.dimensions ? { label: "Dimensions", value: detail.dimensions } : null,
                  /* Design credits, from listing_team_members -- the same table
                     Project Detail reads for its Credits block, and the second
                     best covered field on this page after Category (38 of 80).
                     Linked only when the credited profile actually resolves:
                     37 of the 38 are unclaimed stubs with no username, so a
                     link would 404. With several credits the row stays plain
                     text rather than linking one name out of four. */
                  detail.designers.length > 0
                    ? {
                        label: detail.designers.length > 1 ? "Designers" : "Designer",
                        value: detail.designers.map((d) => d.name).join(", "),
                        href:
                          detail.designers.length === 1 && detail.designers[0].username
                            ? `/u/${detail.designers[0].username}`
                            : undefined,
                      }
                    : null,
                  detail.year ? { label: "Year", value: String(detail.year) } : null,
                ]}
              />
            </div>

            {/* ── Brand card ──────────────────────────────────────────────
                Inside the sticky unit, not beside it. The specification and
                the brand that makes it are read together, so they travel
                together; leaving the card in its own grid cell would have let
                it scroll away from the product it describes. */}
            <aside className="mt-8">
              {detail.brand && (
                <RailPanel title="Brand">
                  <div className="flex items-center gap-3">
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-stone">
                      {detail.brand.avatarUrl && (
                        <Image
                          src={detail.brand.avatarUrl}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain"
                        />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-body text-[15px] text-ink">
                        {detail.brand.name}
                      </span>
                      {detail.brand.location && (
                        <span className="block truncate font-body text-[12px] text-muted">
                          {detail.brand.location}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Stats, each independently real-or-omitted.
                      FOLLOWERS IS GONE. The mockup showed "3.2k Followers"; the
                      `follows` table holds 9 rows platform-wide and none are
                      product-related, so the number could only ever have been
                      decoration.
                      BOTH FIGURES ARE BRAND-WIDE. Projects-featuring used to read
                      detail.projects.length -- projects featuring this one
                      PRODUCT -- beside a brand-wide product count, so a panel
                      headed "Brand" mixed two scopes: Gillis Armchair showed
                      12 / 1 where the brand-wide answer is 3. The product-scoped
                      list is not lost; "Seen in Projects" lower down shows it in
                      full. */}
                  <dl className="mt-5 grid grid-cols-2 gap-4">
                    {detail.brand.productCount > 0 && (
                      <Stat label="Products" value={detail.brand.productCount} />
                    )}
                    {detail.brand.projectsFeaturingCount > 0 && (
                      <Stat
                        label="Projects featuring"
                        value={detail.brand.projectsFeaturingCount}
                      />
                    )}
                  </dl>

                  {brandHref && (
                    <Link
                      href={brandHref}
                      className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-ink/25 px-4 py-2.5 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
                    >
                      View Brand Profile
                    </Link>
                  )}
                </RailPanel>
              )}

              {/* Downloads, directly under the brand card and inside the same
                  sticky unit, so a spec sheet stays reachable while the
                  description scrolls. Renders nothing when the product has no
                  documents — 31 of 80. */}
              <div className="mt-5">
                <ProductDownloads documents={detail.documents} listingId={detail.id} />
              </div>
            </aside>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────
              Column 1, row 2 — directly under the gallery, and the reason the
              sticky column has anything to travel along: this is the tall
              content. A seven-column track keeps the About panel's 68ch
              measure filling its column instead of reading as a narrow island
              in a full-width field. */}
          <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:col-span-7">
            <ProductAbout product={detail} />
            <ProductCollaborationSection
              product_collaboration_status={detail.collaborationStatus}
              product_looking_for={detail.lookingFor}
            />
          </div>
        </div>

        {/* ── Seen in Projects ────────────────────────────────────────── */}
        <SeenInProjects projects={detail.projects} />

        <OftenSpecifiedWith items={oftenSpecifiedWith} cards={railCards} />

        {detail.brand && (
          <ProductRail
            id="more-from-brand"
            title={`More from ${detail.brand.name}`}
            items={toModels(detail.brand.otherProducts)}
          />
        )}

        {/* Last in the stack. Deduplicated against everything above it — see
            relatedItems, computed with the rest of the rail data. When nothing
            is genuinely additional, ProductRail renders nothing. */}
        <ProductRail title={detail.relatedReason} items={toModels(relatedItems)} />
      </div>

      <HomeFooter />
    </div>
  );
}

/**
 * Specification table. Rows are passed in already resolved-or-null, so the
 * decision about whether a field is real stays with the caller that knows the
 * data, and this only decides how to draw what survived.
 *
 * Renders nothing when every row is null — which is the honest outcome for a
 * product carrying none of these fields, rather than a table of blank cells.
 */
function SpecTable({
  rows,
}: {
  rows: ({ label: string; value: string; href?: string } | null)[];
}) {
  const present = rows.filter(Boolean) as { label: string; value: string; href?: string }[];
  if (present.length === 0) return null;

  return (
    <dl className="mt-6 border-t border-hairline">
      {present.map((r) => (
        <div key={r.label} className="flex gap-4 border-b border-hairline py-2.5">
          <dt className="w-[104px] shrink-0 font-body text-[13px] text-muted">{r.label}</dt>
          <dd className="min-w-0 font-body text-[13px] text-ink">
            {r.href ? (
              <Link href={r.href} className="hover:underline">
                {r.value}
              </Link>
            ) : (
              r.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="font-display text-[20px] leading-none text-ink">{value}</dd>
      <dt className="mt-1 font-body text-[12px] text-muted">{label}</dt>
    </div>
  );
}
