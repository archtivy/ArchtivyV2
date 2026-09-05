"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Where a header dropdown goes on a phone.
 *
 * ── THE BUG THIS EXISTS TO FIX ──────────────────────────────────────────────
 * The header panels were anchored to their trigger: `absolute right-0`, with a
 * width capped at `calc(100vw-2rem)`. That works only when the trigger is the
 * rightmost thing in the bar. Neither of ours is — Create has the bell and the
 * account menu to its right, and the bell has the account menu — so the panel's
 * right edge starts ~40-100px in from the viewport, and a panel nearly as wide
 * as the viewport therefore runs off the LEFT edge. Measured before this fix:
 * the Create menu lost 28px at 390px wide and 41px at 375px, and the
 * notification panel lost 50px at every phone width. Widening the cap cannot
 * fix it; the anchor is what is wrong.
 *
 * ── WHAT REPLACES IT ────────────────────────────────────────────────────────
 * On phones the panel stops being anchored to the trigger and is positioned
 * against the viewport instead: `fixed`, with `left-4 right-4` in CSS, so its
 * width is whatever is left between two 16px gutters and it cannot overhang
 * either edge at any width. Only the vertical position needs measuring, and it
 * is measured rather than guessed — the trigger's own bottom edge plus 8px, so
 * the panel opens directly beneath the control that opened it whether the bar
 * is the public header, the workspace header, or a taller one later.
 *
 * `maxHeight` is derived the same way: whatever is left between the panel's top
 * and the bottom of the viewport, less a matching gutter. A panel with a long
 * scrolling list stays on screen on a short phone instead of running past the
 * bottom.
 *
 * ── ABOVE md IT RETURNS NOTHING ─────────────────────────────────────────────
 * Deliberately. Desktop and tablet keep the anchored dropdown they already had:
 * the components carry that as `md:absolute md:right-0 …` classes, and this
 * hook returning undefined is what lets those classes win. There is no second
 * positioning system on desktop — there is the original one, and on phones an
 * inline top/max-height on top of CSS gutters.
 */

/** Below Tailwind's `md`. Kept as one value so the hook and the `md:` classes agree. */
const MOBILE_QUERY = "(max-width: 767.98px)";

/** Matches the `left-4 right-4` gutters the components apply. */
const GUTTER_PX = 16;

/** The gap between the trigger and the panel below it. */
const OFFSET_PX = 8;

export type MobilePanelPosition = { top: number; maxHeight: number };

/**
 * @param triggerRef element the panel opens beneath — the trigger itself, or a
 *   wrapper that hugs it. The panel is out of flow, so a wrapper containing
 *   both still reports the trigger's height.
 * @param open whether the panel is currently rendered.
 * @returns inline position for phones, or undefined at md and above (and while
 *   closed), where the component's own `md:` classes position it.
 */
export function useMobilePanelPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean
): MobilePanelPosition | undefined {
  const [pos, setPos] = useState<MobilePanelPosition | undefined>(undefined);

  /*
   * Layout effect, not effect: this runs before paint, so the panel is never
   * shown for a frame at the wrong place on its way to the right one.
   */
  useLayoutEffect(() => {
    if (!open) {
      setPos(undefined);
      return;
    }

    const mq = window.matchMedia(MOBILE_QUERY);

    const measure = () => {
      const el = triggerRef.current;
      if (!mq.matches || !el) {
        setPos(undefined);
        return;
      }
      const top = Math.round(el.getBoundingClientRect().bottom + OFFSET_PX);
      setPos({ top, maxHeight: Math.max(0, window.innerHeight - top - GUTTER_PX) });
    };

    measure();

    /*
     * Rotation and the mobile URL bar both change innerHeight, and crossing md
     * has to hand positioning back to the classes. Scroll is captured because
     * a trigger in a non-sticky bar moves under a fixed panel.
     */
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    mq.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      mq.removeEventListener("change", measure);
    };
  }, [open, triggerRef]);

  return pos;
}
