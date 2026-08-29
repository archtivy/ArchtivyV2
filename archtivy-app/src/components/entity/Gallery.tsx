"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Tag } from "lucide-react";

/**
 * Generic entity hero gallery.
 *
 * Deliberately entity-agnostic: takes an array of images and nothing else, so
 * Project Detail, Product Detail and Professional Profile all use one component
 * (Blueprint §19 — "a Project hero, a Product hero, and a Professional cover
 * image use the same gallery/carousel component"). Lives in components/entity/,
 * not components/home/, for that reason.
 *
 * Counter and "+N" tile use the REAL image count passed in; nothing here
 * assumes a fixed number.
 *
 * Motion: slide transition is a CSS opacity/transform crossfade that collapses
 * to an instant swap under prefers-reduced-motion (Blueprint §14).
 */

export interface GalleryHotspot {
  id: string;
  /** 0–100 of the rendered box. Percentages, never pixels, so a pin lands in
   *  the same place at every viewport and aspect ratio. */
  xPercent: number;
  yPercent: number;
  productTitle: string;
  productHref: string;
  productCover?: string | null;
  brandName?: string | null;
}

export interface GalleryImage {
  url: string;
  alt?: string | null;
  /** Public product pins on this image. Optional: most galleries have none. */
  hotspots?: GalleryHotspot[];
}

export interface GalleryProps {
  images: GalleryImage[];
  /** Used for the visually-hidden label and image alt fallbacks. */
  title: string;
  /** How many thumbnails to show before collapsing the rest into "+N". */
  visibleThumbs?: number;
  priority?: boolean;
}

export function Gallery({
  images,
  title,
  visibleThumbs = 6,
  priority = true,
}: GalleryProps) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const touchStartX = useRef<number | null>(null);

  /**
   * Which hotspot's card is open. One at a time, and OPEN-ON-INTENT rather than
   * open-on-hover: a hover-only card is unreachable by keyboard and impossible
   * to dismiss on touch. Hover still previews it on pointer devices, but the
   * open state is what a click, Enter/Space or tap sets — so every input method
   * has the same capability (Blueprint §16, §27).
   */
  const [openHotspot, setOpenHotspot] = useState<string | null>(null);
  const hotspots = images[index]?.hotspots ?? [];

  const go = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  // Keyboard control when the gallery has focus (Blueprint §27).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && openHotspot) {
      // Escape closes the card before it does anything else — standard
      // dismissal for any transient overlay.
      e.stopPropagation();
      setOpenHotspot(null);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  // Touch swipe on mobile, per the responsive note.
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

  useEffect(() => {
    if (index >= total && total > 0) setIndex(0);
  }, [index, total]);

  // Changing slide must not leave a card open over a different photo.
  useEffect(() => {
    setOpenHotspot(null);
  }, [index]);

  if (total === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-stone">
        <p className="font-body text-[13px] text-muted">No images yet</p>
      </div>
    );
  }

  const current = images[index];
  const remainder = Math.max(0, total - visibleThumbs);
  const thumbs = images.slice(0, visibleThumbs);

  /*
   * Pin discoverability.
   *
   * A pin sits on ONE photo. With 24 photos and 6 thumbnails, the single
   * pinned image on FR House is #13 — behind the "+18" tile and reachable only
   * by clicking Next twelve times. A per-thumbnail badge alone would therefore
   * not have surfaced it, so there are three signals: a badge on any visible
   * thumbnail with pins, a badge on the "+N" tile when a HIDDEN image has
   * pins, and a count in the photo pill that names the total.
   *
   * COUNTS ONLY WHAT IS PUBLICLY VISIBLE. `hotspots` arrives already filtered
   * to verified/official, and this deliberately does not reach for pending
   * ones: a badge promising products on a photo that renders none would be a
   * false signal, and it would leak the existence of unconfirmed guesses.
   * The owner's PinEditor already badges every pin including pending.
   */
  const pinnedImageCount = images.filter((i) => (i.hotspots?.length ?? 0) > 0).length;
  const hiddenPinned = images
    .slice(visibleThumbs)
    .some((i) => (i.hotspots?.length ?? 0) > 0);

  const thumbItems = (
    <>
        {thumbs.map((img, i) => (
          <li key={img.url + i} className="shrink-0">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={
                (img.hotspots?.length ?? 0) > 0
                  ? `Show image ${i + 1}, has ${img.hotspots!.length} tagged ${
                      img.hotspots!.length === 1 ? "product" : "products"
                    }`
                  : `Show image ${i + 1}`
              }
              aria-current={i === index}
              className={[
                "relative block h-16 w-24 overflow-hidden rounded bg-stone transition-opacity",
                i === index ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100",
              ].join(" ")}
            >
              <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              {(img.hotspots?.length ?? 0) > 0 && (
                <span
                  className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink/80 text-cream"
                  aria-hidden
                >
                  <Tag strokeWidth={2} className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          </li>
        ))}
        {remainder > 0 && (
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => setIndex(visibleThumbs)}
              aria-label={
                hiddenPinned
                  ? `Show ${remainder} more images, some with tagged products`
                  : `Show ${remainder} more images`
              }
              className="relative flex h-16 w-24 items-center justify-center rounded bg-stone font-body text-[13px] text-ink transition-colors hover:bg-stone/70"
            >
              +{remainder}
              {hiddenPinned && (
                <span
                  className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink/80 text-cream"
                  aria-hidden
                >
                  <Tag strokeWidth={2} className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          </li>
        )}
    </>
  );

  return (
    <div>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} — image ${index + 1} of ${total}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-stone focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {images.map((img, i) => (
          <Image
            key={img.url + i}
            src={img.url}
            alt={i === index ? img.alt || title : ""}
            fill
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority={priority && i === 0}
            aria-hidden={i !== index}
            className={[
              "object-cover transition-opacity duration-300 ease-out",
              "motion-reduce:transition-none",
              i === index ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        ))}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-ink transition-opacity hover:opacity-90"
            >
              <ChevronLeft strokeWidth={1.5} className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-ink transition-opacity hover:opacity-90"
            >
              <ChevronRight strokeWidth={1.5} className="h-5 w-5" />
            </button>

            <span
              className="absolute right-4 top-4 z-10 rounded-full bg-ink/70 px-3 py-1 font-body text-[12px] tabular-nums text-cream backdrop-blur-sm"
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </>
        )}

        <span className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-ink/70 px-3.5 py-2 font-body text-[12px] text-cream backdrop-blur-sm">
          <Images strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          {total} {total === 1 ? "photo" : "photos"}
          {pinnedImageCount > 0 && (
            <>
              <span className="opacity-50" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Tag strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
                {pinnedImageCount} with products
              </span>
            </>
          )}
        </span>

        {/* ── Product hotspots ────────────────────────────────────────────
            Rendered only for the current slide. Each is a real <button> with
            aria-expanded, so it is tabbable, operable by Enter/Space, and
            announced as a disclosure — not a div that only responds to hover. */}
        {hotspots.map((h) => (
          <Hotspot
            key={h.id}
            hotspot={h}
            open={openHotspot === h.id}
            onToggle={() => setOpenHotspot((cur) => (cur === h.id ? null : h.id))}
            onClose={() => setOpenHotspot(null)}
          />
        ))}
      </div>

      {/*
        Text equivalent of the pins, always in the DOM.
        A positioned marker over a photograph is inherently visual: it conveys
        WHERE on the image the product is, which no screen reader can convey
        usefully. Rather than approximate that, the same products are listed
        here as ordinary links — so the information (which products appear in
        this photo) is available without depending on the spatial affordance.
        Visually hidden, because sighted users already have the markers.
      */}
      {hotspots.length > 0 && (
        <div className="sr-only">
          <h3>{`Products in image ${index + 1}`}</h3>
          <ul>
            {hotspots.map((h) => (
              <li key={h.id}>
                <a href={h.productHref}>
                  {h.productTitle}
                  {h.brandName ? ` by ${h.brandName}` : ""}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {total > 1 && <ul className="mt-3 flex gap-2 overflow-x-auto">{thumbItems}</ul>}
    </div>
  );
}

/**
 * A single product pin plus its disclosure card.
 *
 * ACCESSIBILITY, deliberately more than a hover target:
 *   - a real <button> with aria-expanded / aria-controls, so it is reachable by
 *     Tab, operable by Enter and Space for free, and announced as a disclosure;
 *   - hover PREVIEWS the card on pointer devices but does not own the state —
 *     click, keypress and tap all set the same `open`, so no capability exists
 *     on a mouse that is missing on a keyboard or a touchscreen;
 *   - the hit area is 44x44 (the visible dot is 16px, the button is padded out
 *     to meet the touch-target minimum) — a 16px tap target on a photograph is
 *     unusable on a phone;
 *   - Escape closes, handled by the gallery so it works wherever focus sits;
 *   - the card is positioned with translate rather than a fixed side, and
 *     flips when the pin is near an edge, so it never renders off-frame.
 */
function Hotspot({
  hotspot,
  open,
  onToggle,
  onClose,
}: {
  hotspot: GalleryHotspot;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const nearRight = hotspot.xPercent > 65;
  const nearBottom = hotspot.yPercent > 60;
  const cardId = `hotspot-card-${hotspot.id}`;

  return (
    <span
      className="absolute z-20"
      style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
      onMouseLeave={onClose}
    >
      <span className="relative block -translate-x-1/2 -translate-y-1/2">
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
          className="flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cream"
        >
          <span
            className={[
              "block h-4 w-4 rounded-full border-2 border-cream bg-ink/80 shadow-md transition-transform duration-150",
              "motion-reduce:transition-none",
              open ? "scale-125" : "hover:scale-110",
            ].join(" ")}
            aria-hidden
          />
        </button>

        {open && (
          <span
            id={cardId}
            className={[
              "absolute z-30 block w-[210px] overflow-hidden rounded-lg bg-cream shadow-lg",
              nearRight ? "right-6" : "left-6",
              nearBottom ? "bottom-6" : "top-6",
            ].join(" ")}
          >
            <a href={hotspot.productHref} className="flex items-center gap-3 p-2.5">
              {hotspot.productCover && (
                <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded bg-stone">
                  <Image
                    src={hotspot.productCover}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-body text-[13px] leading-[18px] text-ink">
                  {hotspot.productTitle}
                </span>
                {hotspot.brandName && (
                  <span className="block truncate font-body text-[11px] leading-[16px] text-muted">
                    {hotspot.brandName}
                  </span>
                )}
              </span>
            </a>
          </span>
        )}
      </span>
    </span>
  );
}
