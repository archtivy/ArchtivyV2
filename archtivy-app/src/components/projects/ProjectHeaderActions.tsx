"use client";

import { useState } from "react";
import { Share2, MoreHorizontal, Check } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";

/**
 * Share / Save / More, lifted out of ProjectDetailHeader unchanged.
 *
 * ── WHY IT MOVED ────────────────────────────────────────────────────────────
 * These sat under the title as full-size buttons, where three controls with
 * borders and labels carried more visual weight than the project name above
 * them. They now sit on the breadcrumb line, top right, so the title is the
 * only dominant thing in the header. The controls are compact — a bordered
 * pill for Share, the inline SaveToggle, and the icon-only More — rather than
 * primary buttons.
 *
 * The LOGIC is untouched and not duplicated: the same real Web Share API call
 * with a clipboard fallback and its "Link copied" confirmation, the same
 * SaveToggle in its inline variant, and the same More menu with Copy link and
 * Report. This is a move, not a rewrite.
 */
export function ProjectHeaderActions({
  listingId,
  title,
}: {
  listingId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User dismissed the sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; nothing further to do */
    }
  }

  return (
  <div className="flex shrink-0 items-center gap-2">
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
    >
      {copied ? (
        <Check strokeWidth={1.5} className="h-4 w-4" aria-hidden />
      ) : (
        <Share2 strokeWidth={1.5} className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Link copied" : "Share"}
    </button>

    {/* Save is the PRIMARY action here, so the inline variant is used —
        the card variant hides itself until hover, which on a header
        reads as a missing button. */}
    <SaveToggle
      listingId={listingId}
      entityType="project"
      entityTitle={title}
      variant="inline"
    />

    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="More actions"
        aria-expanded={menuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/25 text-ink transition-colors hover:bg-stone/50"
      >
        <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-hairline bg-cream py-1 shadow-[0_2px_8px_rgba(22,22,22,0.06)]">
          <button
            type="button"
            onClick={() => {
              share();
              setMenuOpen(false);
            }}
            className="block w-full px-3 py-2 text-left font-body text-[13px] text-ink hover:bg-stone/50"
          >
            Copy link
          </button>
          <a
            href="/contact"
            className="block px-3 py-2 font-body text-[13px] text-ink hover:bg-stone/50"
          >
            Report
          </a>
        </div>
      )}
      </div>
    </div>
  );
}
