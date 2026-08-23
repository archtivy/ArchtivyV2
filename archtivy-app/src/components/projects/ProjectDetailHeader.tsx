"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, User, Calendar, Home, Share2, MoreHorizontal, Check } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";

/**
 * Detail header (brief §1).
 *
 * Metadata items render only when their field is populated — no "Residential"
 * fallback when building_type is null.
 *
 * Share uses the real Web Share API where available and falls back to copying
 * the URL, with visible confirmation. It is never a no-op button.
 */
export function ProjectDetailHeader({
  listingId,
  title,
  location,
  architect,
  architectHref,
  year,
  buildingType,
}: {
  listingId: string;
  title: string;
  location: string | null;
  architect: string | null;
  architectHref: string | null;
  year: number | null;
  buildingType: string | null;
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
    <header>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
      >
        <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        Back to Projects
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[32px] leading-[1.1] tracking-[-0.02em] text-ink sm:text-[40px]">
            {title}
          </h1>

          <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {location && (
              <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
                <MapPin strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {location}
              </li>
            )}
            {architect && (
              <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
                <User strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {architectHref ? (
                  <Link href={architectHref} className="underline-offset-4 hover:text-ink hover:underline">
                    {architect}
                  </Link>
                ) : (
                  architect
                )}
              </li>
            )}
            {year && (
              <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
                <Calendar strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {year}
              </li>
            )}
            {buildingType && (
              <li className="flex items-center gap-1.5 font-body text-[13px] text-muted">
                <Home strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {buildingType}
              </li>
            )}
          </ul>
        </div>

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
      </div>
    </header>
  );
}
