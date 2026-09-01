"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A popover that escapes its container.
 *
 * ── WHY A PORTAL ────────────────────────────────────────────────────────────
 * Both edit popovers live inside the rail, whose panel is
 * `overflow-hidden rounded-xl` — the clip that gives the card its rounded
 * corners. An absolutely-positioned child is clipped by it regardless of
 * z-index. Measured with the six-field links popover open at 1440: the popover
 * ran to x=685 / bottom=1221 inside a clipper ending at 520 / 1035, so the X
 * and Pinterest fields were rendered but unreachable — and the horizontal clip
 * was already there with four fields.
 *
 * Rendering into document.body with fixed positioning is the fix that does not
 * require touching the rail's own styling.
 *
 * Position is measured from the trigger and re-measured on scroll and resize,
 * and the panel flips above the trigger when there is not room below.
 */
export function AnchoredPopover({
  open,
  anchorRef,
  onClose,
  width = 248,
  align = "start",
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  width?: number;
  align?: "start" | "center";
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const h = panelRef.current?.offsetHeight ?? 0;
      const gap = 8;
      const below = a.bottom + gap;
      // Flip above when the panel would run off the bottom of the viewport.
      const top = below + h > window.innerHeight - 8 && a.top - gap - h > 8 ? a.top - gap - h : below;
      const rawLeft = align === "center" ? a.left + a.width / 2 - width / 2 : a.left;
      // Keep it on screen horizontally whichever way it is aligned.
      const left = Math.min(Math.max(8, rawLeft), window.innerWidth - width - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className="fixed z-[60] rounded-lg border border-hairline bg-cream p-3 text-left shadow-lg"
    >
      {children}
    </div>,
    document.body
  );
}
