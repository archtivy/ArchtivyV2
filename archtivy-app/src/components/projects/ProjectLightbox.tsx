"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Package, Share2 as ConnectionsIcon } from "lucide-react";
import { LightboxShell, LightboxAvatar } from "@/components/lightbox/LightboxShell";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The Project Lightbox — the shared immersive shell, plus a project sidebar.
 *
 * ── EVERY NUMBER IS REAL ────────────────────────────────────────────────────
 * The counter is the gallery length. "N products identified" is
 * project_product_links. "N connections" is the SAME definition the project
 * card uses (getCreditCounts), not one invented for this surface. Credits are
 * whatever roles the project actually carries.
 *
 * ── HOTSPOTS ARE NEVER INVENTED ─────────────────────────────────────────────
 * Pins come from product_tags with real coordinates, filtered to
 * verified/official by getHotspotsForListing. A product known to be used in
 * the project but not located in a given photograph appears in the sidebar's
 * products block and NOWHERE on the image.
 *
 * All shell behaviour — pin geometry, Escape/Back, focus trap, the sub-xl
 * bottom sheet, Save/Share/Fullscreen — lives in LightboxShell.
 */

export interface LightboxCredit {
  /** The real role, e.g. "Architecture", "Photography". */
  role: string;
  name: string;
  href: string | null;
  avatarUrl: string | null;
}

export interface LightboxProduct {
  id: string;
  title: string;
  href: string;
  cover: string | null;
}

export interface ProjectLightboxProps {
  open: boolean;
  onClose: () => void;
  startIndex: number;
  images: GalleryImage[];
  title: string;
  shareUrl: string;
  /** In-page anchors on the project beneath, used by the two block arrows. */
  productsHref: string;
  connectionsHref: string | null;
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
  products: LightboxProduct[];
  productCount: number;
  connectionCount: number;
  listingId: string;
  initialSaved?: boolean;
}

export function ProjectLightbox({
  open,
  onClose,
  startIndex,
  images,
  title,
  shareUrl,
  productsHref,
  connectionsHref,
  locationLabel,
  year,
  credits,
  products,
  productCount,
  connectionCount,
  listingId,
  initialSaved,
}: ProjectLightboxProps) {
  return (
    <LightboxShell
      open={open}
      onClose={onClose}
      startIndex={startIndex}
      images={images}
      title={title}
      shareUrl={shareUrl}
      listingId={listingId}
      entityType="project"
      initialSaved={initialSaved}
      subtitle={[locationLabel, year != null ? String(year) : null].filter(Boolean).join(" · ") || null}
      overlayMeta={
        (locationLabel || credits.length > 0) && (
          <>
            {locationLabel && (
              <p className="flex items-center gap-1.5 font-body text-[13px] text-white/90">
                <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {locationLabel}
              </p>
            )}
            {credits.length > 0 && (
              <p className="pointer-events-auto mt-1 font-body text-[15px] leading-[22px] text-white/80">
                {credits.slice(0, 2).map((c, i) => (
                  <span key={`${c.name}-${i}`}>
                    {i > 0 && <span className="px-1.5 text-white/50">·</span>}
                    {c.href ? (
                      <Link
                        href={c.href}
                        onClick={onClose}
                        className="underline-offset-4 transition-colors hover:text-white hover:underline"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </span>
                ))}
              </p>
            )}
          </>
        )
      }
      sidebar={({ close }) => (
        <ProjectSidebar
          title={title}
          locationLabel={locationLabel}
          year={year}
          credits={credits}
          products={products}
          productCount={productCount}
          connectionCount={connectionCount}
          productsHref={productsHref}
          connectionsHref={connectionsHref}
          onNavigate={close}
        />
      )}
    />
  );
}

/**
 * The sidebar's content, independent of the shell that holds it.
 *
 * Rendered twice — as the xl column and inside the sub-xl bottom sheet — from
 * ONE definition, so the tablet and phone panels cannot drift from the desktop
 * one the way two hand-written copies would.
 */
function ProjectSidebar({
  title,
  locationLabel,
  year,
  credits,
  products,
  productCount,
  connectionCount,
  productsHref,
  connectionsHref,
  onNavigate,
}: {
  title: string;
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
  products: LightboxProduct[];
  productCount: number;
  connectionCount: number;
  productsHref: string;
  connectionsHref: string | null;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-6">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          Project
        </p>
        <h2 className="mt-2 font-display text-[26px] leading-[32px] tracking-tight text-white">
          {title}
        </h2>
        {locationLabel && (
          <p className="mt-2 font-body text-[14px] text-white/55">{locationLabel}</p>
        )}
        {year != null && <p className="font-body text-[14px] text-white/55">{year}</p>}

        {credits.length > 0 && (
          <div className="mt-6 space-y-5 border-t border-white/[0.07] pt-5">
            {credits.map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                    {c.role}
                  </p>
                  <p className="mt-1 truncate font-body text-[14px] text-white/85">
                    {c.href ? (
                      <Link
                        href={c.href}
                        onClick={onNavigate}
                        className="underline-offset-4 transition-colors hover:text-white hover:underline"
                      >
                        {c.name}
                      </Link>
                    ) : (
                      c.name
                    )}
                  </p>
                </div>
                <LightboxAvatar name={c.name} url={c.avatarUrl} />
              </div>
            ))}
          </div>
        )}

        {/* Count and previews are project_product_links — the home for every
            product known to be in the project, including the many with no pin. */}
        {productCount > 0 && (
          <div className="mt-6 border-t border-white/[0.07] pt-5">
            <Link href={productsHref} onClick={onNavigate} className="group flex items-center gap-3">
              <Package
                strokeWidth={1.5}
                className="h-[18px] w-[18px] shrink-0 text-white/60"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-[14px] text-white/90">
                  {productCount} product{productCount === 1 ? "" : "s"} identified
                </span>
                <span className="block font-body text-[12px] text-white/45">
                  Explore all products used
                </span>
              </span>
              <ArrowRight
                strokeWidth={1.5}
                className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>

            {products.length > 0 && (
              <ul className="mt-4 flex gap-2">
                {products.slice(0, 4).map((pr) => (
                  <li key={pr.id} className="min-w-0 flex-1">
                    <Link
                      href={pr.href}
                      onClick={onNavigate}
                      title={pr.title}
                      className="relative block aspect-square overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.06] transition-colors hover:border-white/25"
                    >
                      {pr.cover && (
                        <Image src={pr.cover} alt={pr.title} fill sizes="80px" className="object-cover" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* The project card's definition of a connection, unchanged: distinct
            profile-linked credits. Rendered only with a real destination, so
            the arrow is never dead. */}
        {connectionCount > 0 && connectionsHref && (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <Link href={connectionsHref} onClick={onNavigate} className="group flex items-center gap-3">
              <ConnectionsIcon
                strokeWidth={1.5}
                className="h-[18px] w-[18px] shrink-0 text-white/60"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-[14px] text-white/90">
                  {connectionCount} connection{connectionCount === 1 ? "" : "s"}
                </span>
                <span className="block font-body text-[12px] text-white/45">
                  Products and people linked to this project
                </span>
              </span>
              <ArrowRight
                strokeWidth={1.5}
                className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        )}
      </div>

    </>
  );
}

