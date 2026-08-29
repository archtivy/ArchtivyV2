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
 */
export function HorizontalRail({
  children,
  ariaLabel,
  className = "",
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1px of slack: sub-pixel widths make an exact comparison flicker the
    // arrow on and off at the extremes.
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
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
  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-cream text-ink transition-colors hover:border-ink/30 disabled:cursor-default disabled:opacity-0";

  const hasOverflow = !(atStart && atEnd);

  return (
    <div className={`relative ${className}`}>
      <ul
        ref={ref}
        onScroll={measure}
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      {hasOverflow && (
        <>
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Scroll left"
            className={`${arrow} absolute -left-3 top-1/2 z-10 -translate-y-1/2 shadow-[0_2px_8px_rgba(22,22,22,0.08)]`}
          >
            <ChevronLeft strokeWidth={1.5} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Scroll right"
            className={`${arrow} absolute -right-3 top-1/2 z-10 -translate-y-1/2 shadow-[0_2px_8px_rgba(22,22,22,0.08)]`}
          >
            <ChevronRight strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
