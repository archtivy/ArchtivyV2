"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  MapPin,
  Package,
  Share2,
  Share2 as ConnectionsIcon,
  X,
} from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";
import { paintedImageRect, pinOffsetInBox } from "@/lib/gallery/imageFit";
import { shareOrCopy } from "@/lib/share/shareOrCopy";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The Project Lightbox — Archtivy's immersive connected gallery.
 *
 * ── WHAT IT IS FOR ──────────────────────────────────────────────────────────
 * Not an enlarged image viewer. While the photograph dominates, the sidebar
 * answers "what am I looking at, who made it, what is in it, what is it
 * connected to" — the platform's whole proposition, at the moment a reader is
 * most engaged with the work. Metadata supports the image: it lives on a dark
 * surface beside the frame, never over it, except the one restrained credit
 * line the reference places bottom-left.
 *
 * ── EVERY NUMBER IS REAL ────────────────────────────────────────────────────
 * The counter is the gallery length. "N products identified" is
 * project_product_links. "N connections" is the SAME definition the project
 * card uses — distinct profile-linked credits from listing_team_members (see
 * getCreditCounts) — not a new meaning invented for this surface. Credits are
 * whatever roles the project actually carries, so a project with a Lighting
 * Designer and a Landscape Architect shows those rather than being forced into
 * an Architecture/Photography pair.
 *
 * ── HOTSPOTS ARE NEVER INVENTED ─────────────────────────────────────────────
 * Pins come from product_tags with real x_percent/y_percent, already filtered
 * to verified/official by getHotspotsForListing. A product known to be used in
 * the project but not located in a given photograph appears in the sidebar's
 * products block and NOWHERE on the image. Of 13 tags on the platform, 6 sit at
 * a placeholder 50/50 awaiting owner confirmation and are correctly invisible
 * here — positioning them would be fabricating a location.
 *
 * ── OVERLAY BEHAVIOUR ───────────────────────────────────────────────────────
 * Opening pushes ONE history entry at the same URL, so Back closes the lightbox
 * instead of leaving the project. Nothing navigates, so the page underneath is
 * never unmounted and scroll position is preserved for free. Body scroll is
 * locked while open and focus returns to whatever opened it.
 */

export interface LightboxCredit {
  /** The real role from listing_team_members.title, e.g. "Lighting Designer". */
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
  /** Which image to open on; the viewer owns the index from then on. */
  startIndex: number;
  images: GalleryImage[];
  title: string;
  /** Canonical absolute project URL, for Share. Never window.location. */
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
  const [index, setIndex] = useState(startIndex);
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  /** Below xl the sidebar is a bottom sheet rather than a column. */
  const [sheetOpen, setSheetOpen] = useState(false);
  const total = images.length;

  const shellRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const pushedHistory = useRef(false);
  const filmstripRef = useRef<HTMLUListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  /*
   * The painted photograph's rectangle, which is what pins are positioned
   * against — NOT the stage. See lib/gallery/imageFit. Both inputs are
   * measured rather than assumed: the natural size arrives with the decoded
   * image, the stage size from a ResizeObserver, so the pins stay correct
   * through window resizes and orientation changes as well as slide changes.
   */
  const [stageBox, setStageBox] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  // Re-seed on each open so clicking image 12 opens image 12, not wherever the
  // viewer was left last time.
  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setOpenHotspot(null);
      setSheetOpen(false);
    }
  }, [open, startIndex]);

  // A pin card must never survive onto a different photograph.
  useEffect(() => setOpenHotspot(null), [index]);

  /*
   * Back closes the overlay.
   *
   * One entry, same URL: the project page is never unmounted, so closing costs
   * no re-render and no scroll restoration guesswork. `pushedHistory` guards
   * the pair — closing via Escape or the × rewinds the entry we added, and
   * closing via popstate must NOT call back() again or it would rewind the
   * user off the project entirely.
   */
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ archtivyLightbox: true }, "");
    pushedHistory.current = true;
    const onPop = () => {
      pushedHistory.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onClose]);

  const requestClose = useCallback(() => {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      window.history.back();
      return;
    }
    onClose();
  }, [onClose]);

  // Scroll lock + focus capture/restore.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    shellRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  // Keyboard: Escape closes (a pin card first), arrows navigate, Tab is trapped.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      /*
       * Focus trap. The project page is still mounted behind the overlay —
       * deliberately, since that is what preserves scroll — which means Tab
       * would otherwise walk out of the dialog and into a gallery, header and
       * footer the reader cannot see. Wrapping at both ends keeps a keyboard
       * user inside the modal, which is what aria-modal already promises.
       */
      if (e.key === "Tab") {
        const shell = shellRef.current;
        if (!shell) return;
        const focusable = [
          ...shell.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ),
        ].filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === shell)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Innermost layer first: pin card, then the mobile sheet, then the
        // lightbox itself. Escape should never skip a level.
        if (openHotspot) {
          setOpenHotspot(null);
          return;
        }
        if (sheetOpen) {
          setSheetOpen(false);
          return;
        }
        requestClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, openHotspot, sheetOpen, go, requestClose]);

  useEffect(() => {
    const el = stageRef.current;
    if (!open || !el) return;
    const measure = () =>
      setStageBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // A new slide has its own dimensions; keeping the old ones would place the
  // next image's pins using the previous image's aspect ratio for a frame.
  useEffect(() => setNaturalSize({ width: 0, height: 0 }), [index]);

  // Keep the active thumbnail in view as navigation moves past the fold.
  useEffect(() => {
    if (!open) return;
    const strip = filmstripRef.current;
    const active = strip?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index, open]);

  if (!open || total === 0) return null;

  const current = images[index];
  const hotspots = current?.hotspots ?? [];
  const photoRect = paintedImageRect(naturalSize, stageBox, "contain");

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const doShare = async () => {
    const outcome = await shareOrCopy({ title, url: shareUrl });
    if (outcome === "copied") {
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    }
  };

  const goFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  };

  /** Close, then let the browser take the anchor on the page underneath. */
  const closeThenNavigate = () => requestClose();

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0b0b0c] p-0 sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — gallery`}
    >
      <div
        ref={shellRef}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#121213] outline-none sm:rounded-2xl sm:border sm:border-white/[0.07]"
      >
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div className="flex h-14 shrink-0 items-center gap-3 px-4 sm:h-16 sm:px-6">
          <span className="font-display text-[17px] tracking-tight text-white/90">
            archtivy
          </span>
          <span className="h-4 w-px bg-white/15" aria-hidden />
          <span className="min-w-0 truncate font-body text-[13px] text-white/60">
            {title}
          </span>
          <span className="ml-auto flex items-center gap-4">
            <span className="font-body text-[13px] tabular-nums text-white/50">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close gallery"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X strokeWidth={1.5} className="h-5 w-5" />
            </button>
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          {/* ── Image stage ───────────────────────────────────────────── */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={stageRef}
              className="relative min-h-0 flex-1"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* object-contain: the whole frame, never a destructive crop, and
                  never upscaled past its own box. */}
              <Image
                key={current.url}
                src={current.url}
                alt={current.alt || `${title} — image ${index + 1} of ${total}`}
                fill
                sizes="(max-width: 1279px) 100vw, 72vw"
                priority
                onLoadingComplete={(el) =>
                  setNaturalSize({ width: el.naturalWidth, height: el.naturalHeight })
                }
                className="object-contain"
              />

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 sm:left-6"
                  >
                    <ChevronLeft strokeWidth={1.5} className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-6"
                  >
                    <ChevronRight strokeWidth={1.5} className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Real pins only — see the header note.
                  They live in a layer laid exactly over the PAINTED image, not
                  over the stage, so a percentage means the same point on the
                  photograph here as it does anywhere else. Rendered only once
                  the rectangle is known, so nothing flashes at the wrong spot
                  and then jumps. */}
              {photoRect && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: photoRect.x,
                    top: photoRect.y,
                    width: photoRect.width,
                    height: photoRect.height,
                  }}
                >
                  {hotspots.map((h) => (
                    <LightboxHotspot
                      key={h.id}
                      hotspot={h}
                      open={openHotspot === h.id}
                      onToggle={() =>
                        setOpenHotspot((cur) => (cur === h.id ? null : h.id))
                      }
                      onClose={() => setOpenHotspot(null)}
                    />
                  ))}
                </div>
              )}

              {/* Bottom-left credit line, over the image, as the reference has
                  it. Each part is omitted when the field is absent rather than
                  rendered as an empty row. */}
              {/* Legibility scrim for the credit line below.
                  The reference's photograph happens to be dark where the text
                  sits; a real gallery is not. FR House image 13 puts this line
                  over a white rug, where 70% white on its own is unreadable
                  whatever text-shadow is applied. The gradient is confined to
                  the bottom third and fades to fully transparent, so it darkens
                  the type's background without tinting the photograph. */}
              {(locationLabel || credits.length > 0) && (
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
                  aria-hidden
                />
              )}

              {(locationLabel || credits.length > 0) && (
                <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[70%] sm:bottom-6 sm:left-6">
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
                              onClick={closeThenNavigate}
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
                </div>
              )}
            </div>

            {/* ── Filmstrip ───────────────────────────────────────────── */}
            {total > 1 && (
              <ul
                ref={filmstripRef}
                aria-label="Gallery thumbnails"
                className="flex shrink-0 gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
              >
                {images.map((img, i) => (
                  <li key={img.url + i} className="shrink-0">
                    <button
                      type="button"
                      data-active={i === index}
                      onClick={() => setIndex(i)}
                      aria-label={`Show image ${i + 1} of ${total}`}
                      aria-current={i === index}
                      className={[
                        "relative block h-14 w-20 overflow-hidden rounded-md bg-white/5 transition-all sm:h-[70px] sm:w-[104px]",
                        i === index
                          ? "opacity-100 ring-2 ring-white/80"
                          : "opacity-45 hover:opacity-80",
                      ].join(" ")}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="104px"
                        className="object-cover"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Sidebar: a column at xl, a bottom sheet below it ──────────
              ONE body, rendered in two shells. The reference's column would
              leave a 1024px tablet 56% of its width for the photograph, and the
              brief is explicit that image priority wins and that the panel may
              become contextual instead. Below xl it is therefore a sheet opened
              from the bar under the filmstrip — never a squeezed second column,
              and never a duplicated copy of the markup. */}
          <div className="hidden shrink-0 overflow-y-auto xl:block xl:w-[368px] xl:pb-6 xl:pr-6 xl:pt-2 2xl:w-[400px]">
            <SidebarBody
              title={title}
              locationLabel={locationLabel}
              year={year}
              credits={credits}
              products={products}
              productCount={productCount}
              connectionCount={connectionCount}
              productsHref={productsHref}
              connectionsHref={connectionsHref}
              listingId={listingId}
              initialSaved={initialSaved}
              shareState={shareState}
              onShare={doShare}
              onFullscreen={goFullscreen}
              onNavigate={closeThenNavigate}
            />
          </div>
        </div>

        {/* ── Compact bar below xl ─────────────────────────────────────
            Carries the credit line the wide layout puts over the image, plus
            the way into the sheet. */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.07] px-4 py-3 xl:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[14px] text-white/90">{title}</span>
            {locationLabel && (
              <span className="block truncate font-body text-[12px] text-white/45">
                {locationLabel}
                {year != null ? ` · ${year}` : ""}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            className="shrink-0 rounded-full border border-white/15 px-4 py-2 font-body text-[13px] text-white/85 transition-colors hover:bg-white/10"
          >
            Details
          </button>
        </div>

        {sheetOpen && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end xl:hidden">
            <button
              type="button"
              aria-label="Close project details"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div
              role="dialog"
              aria-label={`${title} — project details`}
              className="relative max-h-[82%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#121213] px-4 pb-6 pt-3"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
              <SidebarBody
                title={title}
                locationLabel={locationLabel}
                year={year}
                credits={credits}
                products={products}
                productCount={productCount}
                connectionCount={connectionCount}
                productsHref={productsHref}
                connectionsHref={connectionsHref}
                listingId={listingId}
                initialSaved={initialSaved}
                shareState={shareState}
                onShare={doShare}
                onFullscreen={goFullscreen}
                onNavigate={closeThenNavigate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The sidebar's content, independent of the shell that holds it.
 *
 * Rendered twice — as the xl column and inside the sub-xl bottom sheet — from
 * ONE definition, so the tablet and phone panels cannot drift from the desktop
 * one the way two hand-written copies would.
 */
function SidebarBody({
  title,
  locationLabel,
  year,
  credits,
  products,
  productCount,
  connectionCount,
  productsHref,
  connectionsHref,
  listingId,
  initialSaved,
  shareState,
  onShare,
  onFullscreen,
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
  listingId: string;
  initialSaved?: boolean;
  shareState: "idle" | "copied";
  onShare: () => void;
  onFullscreen: () => void;
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
                <Avatar name={c.name} url={c.avatarUrl} />
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

      {/* Save is the EXISTING SaveToggle over folder_items — no second
          lightbox-local saved state to fall out of sync with the card behind. */}
      <div className="mt-4 flex items-center justify-end gap-2">
        {/*
         * ── WHY THE CHILD SELECTOR ────────────────────────────────────────
         * SaveToggle's `card` variant positions ITSELF with `absolute right-3
         * top-3`, because everywhere else it overlays the corner of a
         * photograph. Dropped into a 44px circle that offset pushed the 32px
         * button to x0/y12 — visibly low and left of the two buttons beside
         * it, and clipped at the bottom. The variant is right for its normal
         * callers, so this neutralises the offset locally instead of changing
         * a component five other surfaces render. The wrapper stays `relative`
         * so the board popover still anchors to it.
         */}
        <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white [&>span]:!static [&>span]:!inset-auto">
          <SaveToggle
            listingId={listingId}
            entityType="project"
            entityTitle={title}
            initialSaved={initialSaved}
            variant="card"
            align="left"
            alwaysVisible
            tone="dark"
          />
        </span>
        <button
          type="button"
          onClick={onShare}
          aria-label={shareState === "copied" ? "Link copied" : "Share project"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          {shareState === "copied" ? (
            <Check strokeWidth={1.5} className="h-[18px] w-[18px]" />
          ) : (
            <Share2 strokeWidth={1.5} className="h-[18px] w-[18px]" />
          )}
        </button>
        <button
          type="button"
          onClick={onFullscreen}
          aria-label="Toggle fullscreen"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <Expand strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </button>
      </div>
    </>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-body text-[12px] text-white/70">
      {url ? (
        <Image src={url} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        // Initials from the real name, never a stock face.
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase())
          .join("")
      )}
    </span>
  );
}

/**
 * A pin: a circular + marker with its label beside it, as the reference draws.
 *
 * The label FLIPS to the other side when the pin sits near the right edge, so a
 * product tagged at x=89% does not render its name off-frame. Hover previews on
 * pointer devices, but click / Enter / Space / tap all set the same open state,
 * so no capability exists on a mouse that is missing on a keyboard or a phone.
 * The hit area is 44x44 around a 22px dot for touch.
 */
function LightboxHotspot({
  hotspot,
  open,
  onToggle,
  onClose,
}: {
  hotspot: NonNullable<GalleryImage["hotspots"]>[number];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const flip = hotspot.xPercent > 62;
  const cardId = `lightbox-hotspot-${hotspot.id}`;

  return (
    /*
     * ── THE ANCHOR IS A FIXED 44px BOX, AND THE CARD LEAVES THE FLOW ────────
     * This used to be a flex ROW holding the button and the card as siblings,
     * with -translate-x-1/2 on the row. Closed, the row was 44px wide and the
     * translate put the dot on the coordinate. Opened, the row became button +
     * card — about 232px — and the same -50% translate then shifted the whole
     * row, DOT INCLUDED, sideways. Measured: hovering a pin moved its own dot
     * 89.5px, out from under the cursor that had just opened it.
     *
     * So the anchor is now a constant 44x44 regardless of state, and the card
     * is positioned absolutely against it. Layout cannot change when the card
     * appears, so the dot cannot move.
     *
     * onMouseLeave sits on THIS element rather than the button, because the
     * card is a descendant of it: mouseleave does not fire when the pointer
     * moves onto a descendant, so travelling dot -> card keeps it open and the
     * link stays clickable, while leaving the pair entirely closes it. Without
     * any leave handler at all — the previous state — a hover-opened card
     * stayed open forever, and the dot had moved away so it could not even be
     * re-hovered to dismiss.
     */
    <span
      className="pointer-events-auto absolute z-30 block h-11 w-11 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => {
          if (!open) onToggle();
        }}
        aria-expanded={open}
        aria-controls={cardId}
        aria-label={`Product in this photo: ${hotspot.productTitle}${
          hotspot.brandName ? ` by ${hotspot.brandName}` : ""
        }`}
        className="absolute inset-0 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <span
          className={[
            "flex h-[22px] w-[22px] items-center justify-center rounded-full",
            "border border-white/70 bg-black/45 text-white backdrop-blur-sm",
            "transition-transform duration-150 motion-reduce:transition-none",
            open ? "scale-110" : "hover:scale-105",
          ].join(" ")}
          aria-hidden
        >
          <span className="text-[13px] leading-none">+</span>
        </span>
      </button>

      {open && (
        <Link
          id={cardId}
          href={hotspot.productHref}
          /* w-max so it sizes to its text rather than stretching the anchor,
             capped so a long product name still wraps instead of running off
             the photograph. Flipped to the inside for pins near the right
             edge, same rule as before. */
          className={[
            "absolute top-1/2 w-max max-w-[190px] -translate-y-1/2",
            "rounded-lg bg-black/80 px-3 py-2 backdrop-blur-sm",
            "transition-colors hover:bg-black/90",
            /* NEGATIVE margin, so the card OVERLAPS the anchor box by 4px
               rather than sitting 4px clear of it. mouseleave does not fire
               when the pointer moves onto a descendant, but a gap is neither
               the anchor nor the card — the pointer crossing it counted as
               leaving, and the card closed before it could be clicked. With
               the two touching there is nothing in between to fall through.
               The visible dot is 22px inside a 44px box, so this still leaves
               ~7px of clear space between the dot and the card. */
            flip ? "right-full -mr-1" : "left-full -ml-1",
          ].join(" ")}
        >
          <span className="block truncate font-body text-[13px] leading-[18px] text-white">
            {hotspot.productTitle}
          </span>
          {hotspot.brandName && (
            <span className="block truncate font-body text-[12px] leading-[16px] text-white/55">
              {hotspot.brandName}
            </span>
          )}
        </Link>
      )}
    </span>
  );
}
