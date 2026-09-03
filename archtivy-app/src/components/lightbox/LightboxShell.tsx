"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Expand, Share2, X } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";
import { shareOrCopy } from "@/lib/share/shareOrCopy";
import { paintedImageRect } from "@/lib/gallery/imageFit";
import type { GalleryImage } from "@/components/entity/Gallery";

/**
 * The immersive gallery shell, shared by Project and Product.
 *
 * ── WHY THIS IS ONE COMPONENT ───────────────────────────────────────────────
 * The Product lightbox is the Project lightbox with a different sidebar. Every
 * other part — the dark shell, the counter, the object-contain stage, the
 * arrows, the filmstrip, the pins, the scrim, Escape/Back/focus-trap/scroll
 * lock, the sub-xl bottom sheet, and Save/Share/Fullscreen — is identical.
 * Copying it would have produced two 900-line files that agree today and drift
 * on the next fix; this codebase has that failure mode on record several times
 * over. So the shell is generic and each entity supplies only its sidebar.
 *
 * Everything here was verified on the project lightbox before extraction:
 * pins resolve against the PAINTED image (lib/gallery/imageFit) rather than
 * the stage, the pin anchor is a constant 44px box so opening a label cannot
 * move the dot, Escape unwinds one layer at a time, and Back closes without
 * leaving the page underneath.
 */

export interface LightboxShellProps {
  open: boolean;
  onClose: () => void;
  /** Which image to open on; the viewer owns the index from then on. */
  startIndex: number;
  images: GalleryImage[];
  title: string;
  /** Canonical absolute URL, for Share. Never window.location. */
  shareUrl: string;
  listingId: string;
  entityType: "project" | "product";
  initialSaved?: boolean;
  /** Restrained line over the bottom-left of the photograph. Omitted if absent. */
  overlayMeta?: React.ReactNode;
  /** One plain line under the title in the sub-xl bar. Omitted if absent. */
  subtitle?: string | null;
  /** The entity's sidebar. `close` dismisses the lightbox before navigating. */
  sidebar: (api: { close: () => void }) => React.ReactNode;

  /*
   * ── VISUAL DISCOVERY (all optional; the shell works exactly as before
   *    when none of it is passed) ─────────────────────────────────────────
   * Clickable object boxes for the CURRENT image, in the same 0–100
   * percentage space as hotspots, resolved against the same painted
   * rectangle. The shell owns the slide index, so it is the only thing that
   * can say which image is on screen — hence onActiveImageChange.
   */
  regions?: StageRegion[];
  selectedRegionId?: string | null;
  onRegionSelect?: (regionId: string | null) => void;
  onActiveImageChange?: (image: GalleryImage, index: number) => void;

  /**
   * Whether the shell draws Save alongside Share and Fullscreen.
   *
   * The product panel puts Save in its own primary action row, where the
   * design asks for it. Two Save controls over one mechanism would be a
   * duplicate control, so that panel turns this off. Share and Fullscreen are
   * unaffected either way.
   */
  showSave?: boolean;
}

/** Geometry only. No label, type or confidence ever reaches this component. */
export interface StageRegion {
  id: string;
  /** Centre, 0–100 of the photograph. */
  x: number;
  y: number;
  /** Box size, 0–100 of the photograph. */
  width: number;
  height: number;
}

export function LightboxShell({
  open,
  onClose,
  startIndex,
  images,
  title,
  shareUrl,
  listingId,
  entityType,
  initialSaved,
  overlayMeta,
  subtitle,
  sidebar,
  regions,
  selectedRegionId = null,
  onRegionSelect,
  onActiveImageChange,
  showSave = true,
}: LightboxShellProps) {
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
   * Tell the caller which photograph is showing.
   *
   * Held in a ref so that a caller passing an inline arrow — which every
   * caller does — cannot turn this into a render loop. The effect depends on
   * the slide, not on the identity of the function.
   */
  const activeImageCbRef = useRef(onActiveImageChange);
  activeImageCbRef.current = onActiveImageChange;
  useEffect(() => {
    if (!open) return;
    const img = images[index];
    if (img) activeImageCbRef.current?.(img, index);
  }, [open, index, images]);

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
        // A selected object is a layer too: Escape should return the reader to
        // the whole-room feed before it starts closing anything.
        if (selectedRegionId && onRegionSelect) {
          onRegionSelect(null);
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
  }, [open, openHotspot, sheetOpen, go, requestClose, selectedRegionId, onRegionSelect]);

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

  /**
   * Dismiss the viewer because the reader is LEAVING for another page.
   *
   * ── WHY THIS IS NOT requestClose ───────────────────────────────────────
   * It used to be, and that silently broke every link in the sidebar.
   * requestClose rewinds the history entry the viewer pushed on open, and
   * `history.back()` is asynchronous: the click handler ran, the router
   * pushed the product URL, and then the queued back() popped it again. The
   * reader clicked a product and stayed exactly where they were. Measured on
   * Istanbul House Design — the card's href was already the correct canonical
   * URL, /products/lighting/ceiling/pendant/aeris-104-led-glass-pendant-lamp,
   * and the address bar never changed.
   *
   * The tell was that the credit links over the photograph always worked:
   * they call the plain onClose and never touch history.
   *
   * So this only clears state. The pushed entry is left alone — it holds the
   * same URL as the page being left, so Back from the product lands on the
   * project either way, and rewinding it is precisely what cancels the
   * navigation. Closing by Escape, the ×, or Back is unaffected and still
   * goes through requestClose.
   */
  const closeThenNavigate = () => {
    pushedHistory.current = false;
    onClose();
  };

  return (
    <div
      /* Edge to edge. This carried `p-0 sm:p-4 lg:p-6`, which framed the
         viewer as a floating card on a backdrop — the photograph is the
         subject and it should reach the screen's edges. */
      className="fixed inset-0 z-[100] bg-[#0b0b0c]"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — gallery`}
    >
      <div
        ref={shellRef}
        tabIndex={-1}
        /* No rounded corners and no hairline border: with the padding gone
           there is nothing for them to sit against, and both were what made
           this read as a modal rather than a viewer. */
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#121213] outline-none"
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
                  {/*
                    ── RECOGNISED OBJECTS ─────────────────────────────────
                    Nothing is drawn at rest. The photograph is the subject,
                    and a grid of permanent rectangles over a building is the
                    opposite of what this feature is for.

                    On approach each object gets a light treatment rather than
                    an outline: a soft interior lift, a luminous edge with no
                    hard 1px line, and one slow sweep down the region — the
                    visual grammar of something being read. Selected, it holds
                    a steadier edge and a single breathing point at its centre.
                    All white at low alpha, all fading, none of it coloured:
                    a tinted or neon edge would sit ON the photograph as a UI
                    object instead of looking like the image catching light.

                    Below the pins in z-order (10 against 30/35) so a
                    confirmed product's marker always wins a click that lands
                    on both: an owner's statement outranks a detection.

                    Sorted LARGEST FIRST so the smallest box paints last and
                    therefore receives the click. A lamp standing inside the
                    bounds of the table it sits on has to be selectable, and
                    the smaller of two overlapping boxes is always the more
                    specific answer to "what did they click".

                    Geometry, hit-testing and the click contract are exactly
                    as before — only the paint changed.
                  */}
                  {regions && regions.length > 0 && onRegionSelect && (
                    <div className="absolute inset-0 z-10">
                      {[...regions]
                        .sort((a, b) => b.width * b.height - a.width * a.height)
                        .map((r) => {
                          const selected = r.id === selectedRegionId;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              aria-label="Find products like this object"
                              aria-pressed={selected}
                              onClick={() => onRegionSelect(selected ? null : r.id)}
                              className="group/ai pointer-events-auto absolute cursor-pointer overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                              style={{
                                left: `${Math.max(0, r.x - r.width / 2)}%`,
                                top: `${Math.max(0, r.y - r.height / 2)}%`,
                                width: `${r.width}%`,
                                height: `${r.height}%`,
                              }}
                            >
                              {/*
                                Interior lift.
                                
                                The object BRIGHTENS rather than being painted
                                over: backdrop-brightness lifts whatever is
                                actually behind it, so this reads on a white
                                studio wall and on a dark interior alike. An
                                earlier version was a white wash at low alpha
                                and was invisible on Istanbul House Design,
                                which is a pale, sunlit room — white light on
                                a white photograph says nothing.
                              */}
                              <span
                                aria-hidden
                                className={[
                                  "absolute inset-0 rounded-xl transition-opacity duration-300 ease-out motion-reduce:transition-none",
                                  selected
                                    ? "opacity-100 backdrop-brightness-[1.13] backdrop-saturate-[1.10]"
                                    : "opacity-0 backdrop-brightness-[1.10] backdrop-saturate-[1.06] group-hover/ai:opacity-100",
                                ].join(" ")}
                                style={{
                                  background:
                                    "radial-gradient(ellipse at center, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0) 75%)",
                                }}
                              />

                              {/* Luminous edge. An inset shadow rather than a
                                  border, so it reads as light gathering along
                                  the object instead of a drawn rectangle. */}
                              <span
                                aria-hidden
                                className={[
                                  "absolute inset-0 rounded-xl transition-opacity duration-300 ease-out motion-reduce:transition-none",
                                  selected ? "opacity-100" : "opacity-0 group-hover/ai:opacity-100",
                                ].join(" ")}
                                style={{
                                  /* Two-tone, for the same reason as the lift:
                                     the light hairline carries the edge on a
                                     dark photograph, the dark one carries it
                                     on a bright photograph, and the outer
                                     bloom softens both so neither reads as a
                                     drawn rectangle. */
                                  boxShadow: selected
                                    ? "inset 0 0 0 1px rgba(255,255,255,0.60), inset 0 0 0 2px rgba(0,0,0,0.16), inset 0 0 26px rgba(255,255,255,0.14), 0 0 30px rgba(0,0,0,0.22)"
                                    : "inset 0 0 0 1px rgba(255,255,255,0.42), inset 0 0 0 2px rgba(0,0,0,0.12), inset 0 0 20px rgba(255,255,255,0.10), 0 0 24px rgba(0,0,0,0.18)",
                                }}
                              />

                              {/* One sweep on approach. Re-applied on every
                                  hover because the class is removed when the
                                  pointer leaves, so it replays rather than
                                  looping — a loop would be decoration. */}
                              {!selected && (
                                <span
                                  aria-hidden
                                  className="absolute inset-x-0 -inset-y-1/2 opacity-0 group-hover/ai:animate-[aiScan_1100ms_cubic-bezier(0.4,0,0.2,1)_forwards] motion-reduce:animate-none"
                                  style={{
                                    background:
                                      "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%)",
                                    mixBlendMode: "overlay",
                                  }}
                                />
                              )}

                              {/* The focus point. Present only while selected,
                                  so at most one exists at a time. */}
                              {selected && (
                                <span
                                  aria-hidden
                                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.7),0_0_0_1px_rgba(0,0,0,0.25)] animate-[aiBreath_2200ms_ease-in-out_infinite] motion-reduce:animate-none"
                                />
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}

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

              {/* Legibility scrim behind the caller's overlay line.
                  The reference photograph happens to be dark where the text
                  sits; a real gallery is not. Confined to the bottom third and
                  fading to transparent, so it darkens the type's background
                  without tinting the photograph. */}
              {overlayMeta && (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-32 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[70%] sm:bottom-6 sm:left-6">
                    {overlayMeta}
                  </div>
                </>
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
              ONE body, rendered in two shells. A column would leave a 1024px
              tablet 56% of its width for the photograph, and image priority
              wins — so below xl it becomes a sheet opened from the bar under
              the filmstrip. Never a squeezed second column, never a duplicated
              copy of the markup. */}
          <div className="hidden shrink-0 overflow-y-auto xl:block xl:w-[368px] xl:pb-6 xl:pr-6 xl:pt-2 2xl:w-[400px]">
            {sidebar({ close: closeThenNavigate })}
            <LightboxActions
              title={title}
              listingId={listingId}
              entityType={entityType}
              initialSaved={initialSaved}
              showSave={showSave}
              shareState={shareState}
              onShare={doShare}
              onFullscreen={goFullscreen}
            />
          </div>
        </div>

        {/* ── Compact bar below xl ─────────────────────────────────────
            Carries the credit line the wide layout puts over the image, plus
            the way into the sheet. */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.07] px-4 py-3 xl:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-body text-[14px] text-white/90">{title}</span>
            {subtitle && (
              <span className="block truncate font-body text-[12px] text-white/45">
                {subtitle}
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
              aria-label="Close details"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <div
              role="dialog"
              aria-label={`${title} — details`}
              className="relative max-h-[82%] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#121213] px-4 pb-6 pt-3"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
              {sidebar({ close: closeThenNavigate })}
              <LightboxActions
                title={title}
                listingId={listingId}
                entityType={entityType}
                initialSaved={initialSaved}
                showSave={showSave}
                shareState={shareState}
                onShare={doShare}
                onFullscreen={goFullscreen}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Save / Share / Fullscreen.
 *
 * Save is the EXISTING SaveToggle over folder_items. There is deliberately no
 * second "favourite" control beside it: the product mockup draws a heart AND a
 * bookmark, but the platform has exactly one save mechanism — no favourites,
 * likes or wishlist table exists anywhere (the only Heart in the codebase is a
 * decorative homepage animation). Two icons over one mechanism would either be
 * a duplicate control or a lie about a feature that does not exist.
 */
function LightboxActions({
  title,
  listingId,
  entityType,
  initialSaved,
  showSave,
  shareState,
  onShare,
  onFullscreen,
}: {
  title: string;
  listingId: string;
  entityType: "project" | "product";
  initialSaved?: boolean;
  showSave: boolean;
  shareState: "idle" | "copied";
  onShare: () => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      {/*
       * SaveToggle's `card` variant positions ITSELF with `absolute right-3
       * top-3`, because everywhere else it overlays a photograph's corner.
       * Dropped into a 44px circle that offset pushed the button low and left
       * and clipped it. Neutralised locally rather than changing a variant
       * five other surfaces render. The wrapper stays `relative` so the board
       * popover still anchors to it.
       */}
      {showSave && (
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white [&>span]:!static [&>span]:!inset-auto">
        <SaveToggle
          listingId={listingId}
          entityType={entityType}
          entityTitle={title}
          initialSaved={initialSaved}
          variant="card"
          align="left"
          alwaysVisible
          tone="dark"
        />
      </span>
      )}
      <button
        type="button"
        onClick={onShare}
        aria-label={shareState === "copied" ? "Link copied" : "Share"}
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
  );
}

export function LightboxAvatar({ name, url }: { name: string; url: string | null }) {
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
      className={[
        "pointer-events-auto absolute block h-11 w-11 -translate-x-1/2 -translate-y-1/2",
        /*
         * ── THE OPEN PIN RISES ABOVE ITS SIBLINGS ─────────────────────────
         * Every pin used to be a flat z-30, and the card is a child of its
         * pin, so it inherits that level. Equal z-index means PAINT ORDER IS
         * DOM ORDER — a pin later in the array drew its dot straight over an
         * earlier pin's open card. Measured on Istanbul House Design, whose
         * two right-hand pins sit 21% apart: no clash at 1600 where the image
         * is wide, but at 1280, 1024 and 768 the card runs under the next
         * pin's marker every time.
         *
         * Raising only the OPEN pin fixes it for any arrangement, because at
         * most one card is open at a time — no pair-wise collision logic
         * needed, and none is worth the complexity at this pin density.
         *
         * 35, not 40: the sub-xl details sheet is z-40, and a pin must never
         * be able to paint over it.
         */
        open ? "z-[35]" : "z-30",
      ].join(" ")}
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
