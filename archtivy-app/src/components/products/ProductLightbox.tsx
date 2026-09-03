"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, Package, Ruler, Tag } from "lucide-react";
import { LightboxShell, LightboxAvatar } from "@/components/lightbox/LightboxShell";
import { DiscoveryFeed } from "@/components/lightbox/DiscoveryFeed";
import { useImageDiscovery, type FeedProduct } from "@/components/lightbox/useImageDiscovery";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The Product Lightbox — the shared immersive shell, plus a product sidebar.
 *
 * ── THE SIDEBAR IS BUILT FROM WHAT EXISTS, NOT FROM THE MOCKUP ──────────────
 * Coverage measured across all 80 live products before any of this was drawn:
 *
 *   brand                      79/80   category        79/80
 *   subtitle                   80/80   designers       38/80
 *   materials                  22/80   year            27/80
 *   dimensions                 16/80   colours          2/80
 *   used in >=1 project        15/80
 *
 * Every row is self-omitting, so a product renders only the rows it has and
 * the card shortens rather than showing blanks. The reference's LIGHT SOURCE
 * row — "LED 4.6W | 2700K | 575 lm" — has NO column behind it anywhere in the
 * schema: no wattage, colour temperature or lumen field exists on listings or
 * the products sidecar. It is not approximated from the description or the
 * title; it is simply absent, and so is its icon.
 *
 * COLOURS is kept despite 2/80 coverage because it is real, it is exactly what
 * a furniture buyer looks for, and self-omission means the other 78 products
 * pay nothing for it. Coverage decides whether a row RENDERS, never whether it
 * is worth having.
 *
 * ── ROW ORDER ───────────────────────────────────────────────────────────────
 * Identity first (brand, designer), then what the object IS (category), then
 * what it is made of and how big it is (materials, dimensions, colours) — the
 * order a specifier reads in. Year sits in the header beside the brand's
 * location, mirroring the project lightbox rather than competing with it.
 */

export interface ProductLightboxDesigner {
  name: string;
  href: string | null;
}

export interface ProductLightboxRelated {
  id: string;
  title: string;
  href: string;
  cover: string | null;
}

export interface ProductLightboxProps {
  open: boolean;
  onClose: () => void;
  startIndex: number;
  images: GalleryImage[];
  title: string;
  shareUrl: string;
  listingId: string;
  initialSaved?: boolean;

  brandName: string | null;
  brandHref: string | null;
  brandAvatarUrl: string | null;
  brandLocation: string | null;
  year: number | null;

  categoryLabel: string | null;
  categoryHref: string | null;
  designers: ProductLightboxDesigner[];
  materials: string[];
  dimensions: string | null;
  colors: string[];

  /** Projects featuring THIS product — project_product_links. */
  projectCount: number;
  projects: ProductLightboxRelated[];
  projectsHref: string | null;

  /** Other products by the same brand. */
  brandProducts: ProductLightboxRelated[];
  brandProductsHref: string | null;
}

export function ProductLightbox(props: ProductLightboxProps) {
  const {
    open,
    onClose,
    startIndex,
    images,
    title,
    shareUrl,
    listingId,
    initialSaved,
    brandName,
    brandHref,
    brandLocation,
    year,
  } = props;

  const subtitle =
    [brandName, brandLocation, year != null ? String(year) : null]
      .filter(Boolean)
      .join(" · ") || null;

  /* One fetch per photograph, held here rather than in the sidebar, which the
     shell renders twice. See the same note in ProjectLightbox. */
  const [activeImageId, setActiveImageId] = useState<string | undefined>(undefined);
  const { data, loading } = useImageDiscovery(activeImageId);
  const onActiveImageChange = useCallback((image: GalleryImage) => {
    setActiveImageId(image.id);
  }, []);

  /*
   * ── NO OVERLAY LINE ON PRODUCTS ───────────────────────────────────────────
   * The project lightbox prints location and credits over the bottom-left of
   * the photograph, and carries a dark scrim so they stay legible on a bright
   * building. A product shot is usually a white studio cut-out, and that scrim
   * greyed the bottom third of it — darkening the product to make room for a
   * brand name the sidebar already shows. The product mockup has no such line
   * either. So overlayMeta is not passed, and the scrim goes with it.
   */
  return (
    <LightboxShell
      open={open}
      onClose={onClose}
      startIndex={startIndex}
      images={images}
      title={title}
      shareUrl={shareUrl}
      listingId={listingId}
      entityType="product"
      initialSaved={initialSaved}
      subtitle={subtitle}
      onActiveImageChange={onActiveImageChange}
      sidebar={({ close }) => (
        <ProductSidebar
          {...props}
          onNavigate={close}
          feedLoading={loading}
          feedSimilar={data?.room.similar ?? []}
        />
      )}
    />
  );
}

function ProductSidebar({
  title,
  brandName,
  brandHref,
  brandAvatarUrl,
  brandLocation,
  year,
  categoryLabel,
  categoryHref,
  designers,
  materials,
  dimensions,
  colors,
  projectCount,
  projects,
  projectsHref,
  brandProducts,
  brandProductsHref,
  onNavigate,
  feedLoading,
  feedSimilar,
}: ProductLightboxProps & {
  onNavigate: () => void;
  feedLoading: boolean;
  feedSimilar: FeedProduct[];
}) {
  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-6">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          Product
        </p>
        <h2 className="mt-2 font-display text-[26px] leading-[32px] tracking-tight text-white">
          {title}
        </h2>
        {brandLocation && (
          <p className="mt-2 font-body text-[14px] text-white/55">{brandLocation}</p>
        )}
        {year != null && <p className="font-body text-[14px] text-white/55">{year}</p>}

        {brandName && (
          <Row
            label="Brand"
            bare
            icon={<LightboxAvatar name={brandName} url={brandAvatarUrl} />}
          >
            <RowValue href={brandHref} onNavigate={onNavigate}>
              {brandName}
            </RowValue>
          </Row>
        )}

        {/* Names only, no role. listing_team_members.title holds the taxonomy
            CATEGORY on product rows ("Furniture"), not a role — rendering it
            would print "Vincent Van Duysen — Furniture" and restate Category. */}
        {designers.length > 0 && (
          <Row label={designers.length === 1 ? "Designer" : "Designers"}>
            <span className="min-w-0 flex-1">
              {designers.map((d, i) => (
                <span key={`${d.name}-${i}`} className="block">
                  <RowValue href={d.href} onNavigate={onNavigate}>
                    {d.name}
                  </RowValue>
                </span>
              ))}
            </span>
          </Row>
        )}

        {categoryLabel && (
          <Row label="Category" icon={<Tag strokeWidth={1.5} className="h-4 w-4" />}>
            <RowValue href={categoryHref} onNavigate={onNavigate}>
              {categoryLabel}
            </RowValue>
          </Row>
        )}

        {materials.length > 0 && (
          <Row label={materials.length === 1 ? "Material" : "Materials"}>
            <span className="min-w-0 flex-1 font-body text-[14px] text-white/85">
              {materials.join(", ")}
            </span>
          </Row>
        )}

        {dimensions && (
          <Row label="Dimensions" icon={<Ruler strokeWidth={1.5} className="h-4 w-4" />}>
            <span className="min-w-0 flex-1 font-body text-[14px] text-white/85">
              {dimensions}
            </span>
          </Row>
        )}

        {colors.length > 0 && (
          <Row label={colors.length === 1 ? "Colour" : "Colours"}>
            <span className="min-w-0 flex-1 font-body text-[14px] text-white/85">
              {colors.join(", ")}
            </span>
          </Row>
        )}

        {/* Projects featuring this product — the same project_product_links
            the "Seen in Projects" section below the fold renders in full. */}
        {projectCount > 0 && projectsHref && (
          <Block
            href={projectsHref}
            onNavigate={onNavigate}
            icon={<Layers strokeWidth={1.5} className="h-[18px] w-[18px]" />}
            title={`Used in ${projectCount} project${projectCount === 1 ? "" : "s"}`}
            subtitle="Explore projects using this product"
            thumbs={projects}
          />
        )}

        {brandProducts.length > 0 && brandName && brandProductsHref && (
          <Block
            href={brandProductsHref}
            onNavigate={onNavigate}
            icon={<Package strokeWidth={1.5} className="h-[18px] w-[18px]" />}
            title={`More from ${brandName}`}
            subtitle="View all products from this brand"
            thumbs={brandProducts}
          />
        )}
      </div>

      {/* The feed, below the spec card and scrolling with it. `exact` is
          empty by construction — see the note at the top of this file. */}
      <DiscoveryFeed
        loading={feedLoading}
        exact={[]}
        similar={feedSimilar}
        mode="room"
        similarHeading="Visually similar"
        onNavigate={onNavigate}
      />
    </>
  );
}

/** A label/value row with a hairline above it. Never rendered empty. */
function Row({
  label,
  icon,
  bare = false,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  /** True when the icon already provides its own container. */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 flex items-center gap-3 border-t border-white/[0.07] pt-5">
      <div className="min-w-0 flex-1">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
          {label}
        </p>
        <div className="mt-1 font-body text-[14px] text-white/85">{children}</div>
      </div>
      {/* `bare` skips the ring for an icon that already draws its own circle,
          e.g. the brand avatar. */}
      {icon &&
        (bare ? (
          icon
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/55">
            {icon}
          </span>
        ))}
    </div>
  );
}

function RowValue({
  href,
  onNavigate,
  children,
}: {
  href: string | null;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  if (!href) return <span className="truncate">{children}</span>;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="truncate underline-offset-4 transition-colors hover:text-white hover:underline"
    >
      {children}
    </Link>
  );
}

/** A relationship block: count, a way in, and up to four real thumbnails. */
function Block({
  href,
  onNavigate,
  icon,
  title,
  subtitle,
  thumbs,
}: {
  href: string;
  onNavigate: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  thumbs: ProductLightboxRelated[];
}) {
  return (
    <div className="mt-6 border-t border-white/[0.07] pt-5">
      <Link href={href} onClick={onNavigate} className="group flex items-center gap-3">
        <span className="shrink-0 text-white/60">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-body text-[14px] text-white/90">{title}</span>
          <span className="block font-body text-[12px] text-white/45">{subtitle}</span>
        </span>
        <ArrowRight
          strokeWidth={1.5}
          className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
      {thumbs.length > 0 && (
        <ul className="mt-4 flex gap-2">
          {thumbs.slice(0, 4).map((t) => (
            /* A quarter each, never flex-1: with one project a grow-to-fill
               thumbnail became a full-width square that dwarfed the rows above
               it. Four is the cap, so one, two or three simply leave space. */
            <li key={t.id} className="min-w-0 shrink-0 basis-[calc(25%-6px)]">
              <Link
                href={t.href}
                onClick={onNavigate}
                title={t.title}
                className="relative block aspect-square overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.06] transition-colors hover:border-white/25"
              >
                {t.cover && (
                  <Image src={t.cover} alt={t.title} fill sizes="80px" className="object-cover" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
