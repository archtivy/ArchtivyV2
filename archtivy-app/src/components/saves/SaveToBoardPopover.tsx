"use client";

import * as React from "react";
import { BoardPickerPanel } from "./BoardPickerPanel";

/**
 * Anchored popover shell for the board picker.
 *
 * ── WHY NOT THE EXISTING DIALOG ─────────────────────────────────────────────
 * SaveToFolderModal covers the viewport with a dark blurred backdrop. That is
 * the right weight for a destructive confirm and the wrong weight for saving a
 * bookmark: it hides the thing being saved, and dismissing it feels like coming
 * back from somewhere. Saving should feel like it happened next to the button
 * that did it.
 *
 * So this positions against its trigger and closes on outside-click or Escape.
 * The parent must be `position: relative` — SaveToggle provides that wrapper.
 *
 * ── THE BACKDROP THAT ISN'T VISIBLE ─────────────────────────────────────────
 * There is still a fixed, transparent click-catcher behind the panel. Without
 * it, closing on outside-click means a document listener that has to
 * distinguish the trigger from the panel from everything else, and gets the
 * "click the trigger to close" case wrong. A transparent layer makes the same
 * behaviour a plain onClick, and also stops a click reaching whatever was
 * underneath — which on a card matters, because the whole card is a link.
 */
export function SaveToBoardPopover({
  open,
  onClose,
  align = "right",
  ...panelProps
}: {
  open: boolean;
  onClose: () => void;
  /** Which edge to align to the trigger. Use "left" near the viewport's right edge. */
  align?: "left" | "right";
} & Omit<React.ComponentProps<typeof BoardPickerPanel>, "onClose">) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        aria-hidden
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-label="Save to board"
        onClick={(e) => {
          // Cards wrap everything in a link; a click inside the picker must
          // never navigate.
          e.preventDefault();
          e.stopPropagation();
        }}
        className={[
          "absolute top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-xl",
          "border border-hairline bg-cream text-ink shadow-[0_4px_24px_-8px_rgba(0,0,0,0.25)]",
          align === "right" ? "right-0" : "left-0",
        ].join(" ")}
      >
        <BoardPickerPanel {...panelProps} onClose={onClose} />
      </div>
    </>
  );
}
