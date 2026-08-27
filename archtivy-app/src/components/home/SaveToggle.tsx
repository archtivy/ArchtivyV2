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
  alwaysVisible = false,
  tone = "light",
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
  /**
   * Card variant only. Show the control at all times instead of revealing it on
   * hover. Opt-in rather than the default, because the hover behaviour is
   * deliberate everywhere else: on a dense grid a permanent control on every
   * tile competes with the images. The shared listing card asks for it because
   * saving is a primary action there and a hover-only control is invisible to
   * anyone who has not moved a mouse over the card — including in a screenshot.
   */
  alwaysVisible?: boolean;
  /**
   * Card variant only. `light` is a cream button with a dark glyph; `dark` is a
   * dark translucent circle with a cream glyph, which reads better over a
   * photograph and is what the card mockup shows.
   */
  tone?: "light" | "dark";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const noun = entityType === "product" ? "Product" : "Project";

  return (
    /*
     * ── THE POSITIONING LIVES HERE, NOT ON THE BUTTON ─────────────────────────
     * This wrapper is `relative` so the board popover can anchor to it. That
     * also made it the offsetParent of anything absolutely positioned INSIDE
     * it — and the card variant's button carried `absolute right-3 top-3`.
     * So the button positioned itself against this span, which is 0x0 and sits
     * in normal flow after the card's image, instead of against the image
     * container. Measured in a headless browser: image container y 700-946,
     * button rendered at y 952-984, x 372 vs the container's 416 — outside the
     * container's bounds, and the container has overflow-hidden, so it was
     * clipped away entirely.
     *
     * It had been invisible the whole time. `opacity-0` until hover hid the
     * fact that hovering revealed a button nobody could see, so the save
     * control on cards never worked. Making it always-visible did not break
     * it; it removed the cloak.
     *
     * The fix is to position the WRAPPER and let the button fill it. `absolute`
     * is itself a positioned value, so the popover keeps its anchor.
     */
    <span
      className={
        variant === "inline"
          ? "relative inline-flex"
          : "absolute right-3 top-3 z-10 inline-flex"
      }
    >
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
                // No positioning classes: the wrapper owns placement now.
                "flex h-8 w-8 items-center justify-center rounded-full",
                "backdrop-blur-sm transition-opacity",
                tone === "dark" ? "bg-ink/55 text-cream" : "bg-cream/90 text-ink",
                // Hidden until intent on pointer devices; always visible on touch,
                // on keyboard focus, once saved, while the picker is open, and
                // whenever the caller opts into alwaysVisible.
                alwaysVisible || saved || open
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
