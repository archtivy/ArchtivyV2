"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { addToSaved, removeFromSaved } from "@/app/actions/saves";

/**
 * Card-level save toggle (Blueprint §15 — one save behaviour everywhere).
 *
 * Uses the same server actions as DetailActions, so saving from a card and
 * saving from a detail page write through one path.
 *
 * ACCESSIBILITY: the button is revealed on hover on pointer devices, but is
 * always present in the DOM, focusable, and made visible by :focus-visible and
 * on touch — hover is never the only way to reach it (Blueprint §16, §27).
 *
 * Signed-out users are routed to /sign-in rather than shown a silent failure;
 * the server action already refuses without a session.
 */
export function SaveToggle({
  listingId,
  initialSaved = false,
  variant = "card",
}: {
  listingId: string;
  initialSaved?: boolean;
  /**
   * `card`   overlays the top-right of an image and reveals on hover.
   * `inline` sits in a normal action row, always visible — required wherever
   *          Save is a PRIMARY action, e.g. a detail-page header, where a
   *          hover-revealed control would be effectively invisible.
   */
  variant?: "card" | "inline";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    // The whole card is a link; the save control must not navigate.
    e.preventDefault();
    e.stopPropagation();

    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      const res = next ? await addToSaved(listingId) : await removeFromSaved(listingId);
      if (res?.error) {
        setSaved(!next); // revert
        if (/sign in/i.test(res.error)) router.push("/sign-in");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save project"}
      className={
        variant === "inline"
          ? [
              "inline-flex h-9 items-center gap-2 rounded-full px-4 font-body text-[13px] transition-opacity",
              saved ? "bg-ink text-cream" : "bg-ink text-cream hover:opacity-90",
            ].join(" ")
          : [
              "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full",
              "bg-cream/90 text-ink backdrop-blur-sm transition-opacity",
              // Hidden until intent on pointer devices; always visible on touch,
              // on keyboard focus, and once saved.
              saved
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
      {variant === "inline" && <span>{saved ? "Saved" : "Save Project"}</span>}
    </button>
  );
}
