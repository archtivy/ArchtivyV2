"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { SaveToBoardPopover } from "@/components/saves/SaveToBoardPopover";

/**
 * Save control — opens the board picker.
 *
 * ── IT USED TO WRITE TO A TABLE NOBODY READ ─────────────────────────────────
 * This called addToSaved/removeFromSaved, which write `listing_saves`. Nothing
 * reads that table: getSavedListingIds has no callers, and /me/saved renders
 * `folders` + `folder_items`, written by an entirely separate control. So
 * pressing Save recorded a row that never appeared anywhere, and because
 * nothing passed `initialSaved` either, the button also forgot the save on the
 * next page load. Two independent reasons for the same symptom — you save
 * something and it is not saved.
 *
 * There is now one save mechanism: boards. This opens the picker, the picker
 * writes folder_items, and /me/saved reads folder_items. See userSaves.ts for
 * the deprecation note on listing_saves.
 *
 * ── ENTITY TYPE IS EXPLICIT ─────────────────────────────────────────────────
 * The label and aria-label were hardcoded to "Save project" — on a shared
 * component used by product surfaces too, so the product page read "Save
 * Project" and product cards announced "Save project" to screen readers. The
 * type is a required prop rather than inferred, because the caller always
 * knows it and a default would silently reintroduce exactly this bug.
 */
export function SaveToggle({
  listingId,
  entityType,
  entityTitle,
  initialSaved = false,
  variant = "card",
  align = "right",
}: {
  listingId: string;
  /** Drives the label and what folder_items records. No default, deliberately. */
  entityType: "project" | "product";
  /** Shown in the picker so it is clear what is being saved. */
  entityTitle: string;
  /**
   * Whether this item is already on any board. Callers that can resolve it
   * server-side should pass it — isEntitySaved() in actions/savedFolders.
   */
  initialSaved?: boolean;
  /**
   * `card`   overlays the top-right of an image and reveals on hover.
   * `inline` sits in a normal action row, always visible — required wherever
   *          Save is a PRIMARY action, e.g. a detail-page header, where a
   *          hover-revealed control would be effectively invisible.
   */
  variant?: "card" | "inline";
  /** Popover edge alignment; flip to "left" for triggers near the right edge. */
  align?: "left" | "right";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const noun = entityType === "product" ? "Product" : "Project";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          // The whole card is a link; the save control must not navigate.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={saved ? `Edit boards for this ${noun.toLowerCase()}` : `Save ${noun.toLowerCase()}`}
        className={
          variant === "inline"
            ? [
                "inline-flex h-9 items-center gap-2 rounded-full px-4 font-body text-[13px] transition-opacity",
                "bg-ink text-cream hover:opacity-90",
              ].join(" ")
            : [
                "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full",
                "bg-cream/90 text-ink backdrop-blur-sm transition-opacity",
                // Hidden until intent on pointer devices; always visible on touch,
                // on keyboard focus, once saved, and while the picker is open.
                saved || open
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                "[@media(hover:none)]:opacity-100",
              ].join(" ")
        }
      >
        <Bookmark
          strokeWidth={1.5}
          className="h-4 w-4"
          fill={saved ? "currentColor" : "none"}
        />
        {variant === "inline" && <span>{saved ? "Saved" : `Save ${noun}`}</span>}
      </button>

      <SaveToBoardPopover
        open={open}
        onClose={() => setOpen(false)}
        align={align}
        entityType={entityType}
        entityId={listingId}
        entityTitle={entityTitle}
        currentPath={pathname ?? "/"}
        onSaved={setSaved}
      />
    </span>
  );
}
