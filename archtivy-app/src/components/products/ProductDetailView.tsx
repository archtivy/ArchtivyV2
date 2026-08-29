import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getProductDetail } from "@/lib/db/productDetail";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Gallery } from "@/components/entity/Gallery";
import { RailPanel, RelatedPanel } from "@/components/entity/RelationshipRail";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { SaveToggle } from "@/components/home/SaveToggle";
import { normaliseExternalUrl } from "@/lib/url/externalUrl";
import { ProductStageBadge, CollaborationBadge } from "@/components/listing/StatusBadge";
import { ProductCollaborationSection } from "@/components/listing/CollaborationSection";
import { RequestQuoteButton } from "@/components/products/RequestQuoteButton";
import { ProductDetailTabs } from "@/components/products/ProductDetailTabs";
import { SeenInProjects } from "@/components/products/SeenInProjects";
import { OftenSpecifiedWith } from "@/components/products/OftenSpecifiedWith";
import { getOftenSpecifiedWith } from "@/lib/db/oftenSpecifiedWith";
import { ListingViewTracker } from "@/components/listing/ListingViewTracker";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import type { ProductCanonical } from "@/lib/canonical-models";

/**
 * Product Detail — Entity Detail Layout archetype (Blueprint §8), the same
 * archetype as Project Detail: hero gallery + tabs + persistent right-hand
 * Relationship Rail (here Product → Brand).
 *
 * GALLERY: uses components/entity/Gallery.tsx unchanged — horizontal thumbnail
 * strip below the hero. The reference screenshot shows a VERTICAL thumbnail
 * rail; that is a deliberate deviation in favour of one gallery component
 * across Project, Product and Professional (Blueprint §19). Not forked, and
 * no layout prop added — see the note reported alongside this build.
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
 *   "Made In"                  no such column
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

        {/* Three columns on desktop: gallery, product information, brand rail.
            The gallery previously spanned two thirds with the title beneath it,
            which pushed the quote button and the specification below the fold on
            a laptop. Side by side, the decision-making information sits next to
            the photograph it describes. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* ── Gallery ────────────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-5">
            <Gallery images={detail.images} title={detail.title} thumbPosition="left" />
          </div>

          {/* ── Product information ────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-4">
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
                  detail.materials.length > 0
                    ? { label: "Materials", value: detail.materials.join(", ") }
                    : null,
                  detail.dimensions ? { label: "Dimensions", value: detail.dimensions } : null,
                  detail.year ? { label: "Year", value: String(detail.year) } : null,
                ]}
              />
            </div>
          </div>

          {/* ── Relationship Rail: Brand ───────────────────────────────── */}
          <aside className="min-w-0 space-y-5 lg:col-span-3">
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
                    decoration. Products and projects-featuring are both counted
                    from ownership and project_product_links, the same way the
                    homepage brand section counts them. */}
                <dl className="mt-5 grid grid-cols-2 gap-4">
                  {detail.brand.productCount > 0 && (
                    <Stat label="Products" value={detail.brand.productCount} />
                  )}
                  {detail.projects.length > 0 && (
                    <Stat label="Projects featuring" value={detail.projects.length} />
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

            {detail.brand?.otherProduct && (
              <RailPanel title={`More from ${detail.brand.name}`}>
                <ListingCardShared
                  model={{
                    id: detail.brand.otherProduct.id,
                    type: "product",
                    title: detail.brand.otherProduct.title,
                    href: detail.brand.otherProduct.href,
                    imageUrl: detail.brand.otherProduct.cover,
                    authorName: detail.brand.otherProduct.brand,
                  }}
                  ratio="1/1"
                  sizes="(max-width: 1024px) 45vw, 20vw"
                />
              </RailPanel>
            )}

            <RelatedPanel
              items={detail.related.map((r) => ({
                id: r.id,
                title: r.title,
                href: r.href,
                cover: r.cover,
                architect: r.brand,
                imageCount: r.imageCount,
              }))}
              reason={detail.relatedReason}
            />
          </aside>
        </div>

        {/* Tabs run the full width below the grid rather than inside the
            information column. About/Details/Downloads are prose and document
            lists; at a third of the page they wrapped every other word. */}
        <div className="mt-14">
          <ProductDetailTabs product={detail} />
        </div>

        <ProductCollaborationSection
          product_collaboration_status={detail.collaborationStatus}
          product_looking_for={detail.lookingFor}
        />

        {/* ── Seen in Projects ────────────────────────────────────────── */}
        <SeenInProjects projects={detail.projects} />

        <OftenSpecifiedWith items={oftenSpecifiedWith} />
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
