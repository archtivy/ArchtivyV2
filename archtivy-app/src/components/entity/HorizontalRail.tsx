"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A horizontal, arrow-navigable strip.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Archtivy's existing horizontal strips (Showcase, MatchesStrip, the gallery
 * thumbnails, the brands directory) are all `flex gap-N overflow-x-auto` — the
 * same convention, re-typed each time, and none of them offers a pointer user
 * a way forward other than a trackpad swipe. This is that convention with the
 * arrows added once, so the next rail adopts it instead of writing a fifth
 * copy. Nothing about the scroll behaviour is new: native overflow scrolling,
 * scroll-snap, and real keyboard focus order through the children.
 *
 * ── WHY A RAIL RATHER THAN A WRAPPING GRID ──────────────────────────────────
 * A four-across grid puts six items in rows of four and two, leaving half a
 * row of empty space, and the empty half grows with the item count. A rail has
 * no second row to leave ragged: six, ten or fifteen items are one row that
 * simply scrolls further.
 *
 * The arrows hide when there is nothing to scroll to, so a rail that fits
 * entirely on screen shows no controls at all and reads as a plain row.
 *
 * ── THE THREE OPTIONS ALL DEFAULT TO WHAT IT ALREADY DID ────────────────────
 * gapClassName, arrowPlacement and pageDots were added for the homepage brand
 * and designer rails. Every default reproduces the previous behaviour exactly,
 * so the existing consumer (ProjectTeam) renders byte-identically and did not
 * need touching. They are presentational knobs on a shared primitive, which is
 * the alternative to a second rail implementation.
 */
export function HorizontalRail({
  children,
  ariaLabel,
  className = "",
  gapClassName = "gap-4",
  arrowPlacement = "edge",
  pageDots = false,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  /** Track gap. "gap-0" lets items carry their own dividers instead. */
  gapClassName?: string;
  /**
   * "edge"    — arrows tucked just outside the track, overlapping it slightly.
   * "outside" — pushed clear of the content, into the page gutter. Only from
   *   `lg`, because below that the homepage gutter is 16px and there is
   *   nowhere for a 36px control to go without overhanging the viewport.
   */
  arrowPlacement?: "edge" | "outside";
  /**
   * Centred page indicators beneath the track.
   *
   * DERIVED FROM REAL SCROLL GEOMETRY, never decorative: the count is
   * ceil(scrollWidth / clientWidth) and the active dot is the page actually in
   * view, so a rail that scrolls in two screens shows two dots — not the four
   * a mockup happened to draw. They are buttons, and each one scrolls to its
   * page. When everything fits, there is one page and nothing renders.
   */
  pageDots?: boolean;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px of slack: sub-pixel widths make an exact comparison flicker the
    // arrow on and off at the extremes.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    const w = el.clientWidth;
    if (w > 0) {
      setPages(Math.max(1, Math.ceil(el.scrollWidth / w)));
      setPage(Math.round(el.scrollLeft / w));
    }
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Scroll by most of a viewport rather than a fixed card width: the children
  // size themselves, so the rail must not assume how wide one of them is.
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  const goToPage = (i: number) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-cream text-ink transition-colors hover:border-ink/30 disabled:cursor-default disabled:opacity-0";

  const hasOverflow = !(atStart && atEnd);
  const left = arrowPlacement === "outside" ? "-left-3 lg:-left-14" : "-left-3";
  const right = arrowPlacement === "outside" ? "-right-3 lg:-right-14" : "-right-3";

  return (
    <div className={`relative ${className}`}>
      <ul
        ref={ref}
        onScroll={measure}
        aria-label={ariaLabel}
        className={`flex snap-x snap-mandatory ${gapClassName} overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {children}
      </ul>

      {hasOverflow && (
        <>
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Scroll left"
            className={`${arrow} absolute ${left} top-1/2 z-10 -translate-y-1/2 shadow-[0_2px_8px_rgba(22,22,22,0.08)]`}
          >
            <ChevronLeft strokeWidth={1.5} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Scroll right"
            className={`${arrow} absolute ${right} top-1/2 z-10 -translate-y-1/2 shadow-[0_2px_8px_rgba(22,22,22,0.08)]`}
          >
            <ChevronRight strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </>
      )}

      {pageDots && pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Go to page ${i + 1} of ${pages}`}
              aria-current={i === page ? "true" : undefined}
              /* One dot per REAL page always — the width shrinks past five so
                 a narrow viewport (390px paginates into seven) stays tidy
                 without dropping or merging pages, which would make the
                 indicator lie about how far the rail goes. */
              className={`h-[3px] rounded-full transition-all ${
                pages > 5 ? "w-4" : "w-7"
              } ${i === page ? "bg-ink" : "bg-hairline hover:bg-ink/30"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
