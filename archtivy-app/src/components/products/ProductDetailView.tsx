import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Mail } from "lucide-react";
import { getProductDetail } from "@/lib/db/productDetail";
import { getAbsoluteUrl } from "@/lib/canonical";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Gallery } from "@/components/entity/Gallery";
import { RailPanel, RelatedPanel } from "@/components/entity/RelationshipRail";
import { EntityCard } from "@/components/home/EntityCard";
import { SaveToggle } from "@/components/home/SaveToggle";
import { ProductDetailTabs } from "@/components/products/ProductDetailTabs";
import { SeenInProjects } from "@/components/products/SeenInProjects";
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
 *   brand follower count       model exists but max 1 per brand; omitted at 0
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

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* ── Gallery + tabs ─────────────────────────────────────────── */}
          <div className="min-w-0 lg:col-span-8">
            <Gallery images={detail.images} title={detail.title} />

            <div className="mt-8">
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

              {detail.subtitle && (
                <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-[24px] text-muted">
                  {detail.subtitle}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <SaveToggle listingId={detail.id} variant="inline" />

                {detail.brand?.website && (
                  <a
                    href={detail.brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
                  >
                    Visit Official Website
                    <ExternalLink strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}

                {/*
                  STUB — no quote-request flow, table or endpoint exists.
                  Points at the real /contact page rather than posting into
                  nothing, same pattern as "Request a Project".
                  TODO(request-a-quote): build the flow, then point this at it.
                */}
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
                >
                  Request a Quote
                  <Mail strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {/* Colour options only when this product genuinely has more than
                  one — no placeholder swatches. Real for 2 of 76 products. */}
              {detail.colorOptions.length > 1 && (
                <div className="mt-6">
                  <p className="font-body text-[12px] text-muted">Finish / Colour</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {detail.colorOptions.map((c) => (
                      <li
                        key={c}
                        className="rounded-full border border-hairline px-3 py-1 font-body text-[12px] text-ink"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <ProductDetailTabs product={detail} />
          </div>

          {/* ── Relationship Rail: Brand ───────────────────────────────── */}
          <aside className="min-w-0 space-y-5 lg:col-span-4">
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

                {/* Stats, each independently real-or-omitted. Followers is
                    dropped at 0 rather than shown as "0 Followers"; the follow
                    model is real but carries at most 1 row per brand today. */}
                <dl className="mt-5 grid grid-cols-2 gap-4">
                  {detail.brand.productCount > 0 && (
                    <Stat label="Products" value={detail.brand.productCount} />
                  )}
                  {detail.projects.length > 0 && (
                    <Stat label="Projects featuring" value={detail.projects.length} />
                  )}
                  {detail.brand.followerCount > 0 && (
                    <Stat label="Followers" value={detail.brand.followerCount} />
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
                <EntityCard
                  href={detail.brand.otherProduct.href}
                  title={detail.brand.otherProduct.title}
                  subtitle={detail.brand.otherProduct.brand}
                  imageUrl={detail.brand.otherProduct.cover}
                  imageCount={detail.brand.otherProduct.imageCount}
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

        {/* ── Seen in Projects ────────────────────────────────────────── */}
        <SeenInProjects projects={detail.projects} />
      </div>

      <HomeFooter />
    </div>
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
