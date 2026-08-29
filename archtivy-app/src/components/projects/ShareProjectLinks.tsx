"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/**
 * Share row.
 *
 * ── ONLY DESTINATIONS THAT ACTUALLY SHARE ───────────────────────────────────
 * The reference shows four icons including Instagram. Instagram has no web
 * share intent — there is no URL that opens a composer with a link — so an
 * Instagram button here could only be decorative or a link to instagram.com.
 * It is not rendered. Facebook and Pinterest both have real intent URLs, and
 * Pinterest's needs an image, which this page has.
 *
 * Copy link is first because it is the one that always works, and it confirms
 * rather than silently succeeding.
 *
 * The URL is read at click time from window.location, so it is correct on
 * every canonical path this page is served at without being passed down.
 */
export function ShareProjectLinks({ title, imageUrl }: { title: string; imageUrl?: string | null }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard denied — the other buttons still work. */
    }
  };

  const open = (build: (url: string) => string) => () => {
    window.open(build(window.location.href), "_blank", "noopener,noreferrer");
  };

  const btn =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-ink/30 hover:text-ink";

  return (
    <div className="flex flex-wrap gap-2.5">
      <button type="button" onClick={copy} className={btn} aria-label="Copy link to this project">
        {copied ? (
          <Check strokeWidth={1.5} className="h-4 w-4 text-ink" aria-hidden />
        ) : (
          <Link2 strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        )}
      </button>

      <button
        type="button"
        onClick={open((u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`)}
        className={btn}
        aria-label="Share this project on Facebook"
      >
        {/* lucide dropped its brand glyphs, so the wordmark is drawn as
            text rather than falling back to a generic icon that says nothing
            about where the click goes. */}
        <span className="font-display text-[15px] leading-none" aria-hidden>
          f
        </span>
      </button>

      <button
        type="button"
        onClick={open(
          (u) =>
            `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}` +
            `&description=${encodeURIComponent(title)}` +
            (imageUrl ? `&media=${encodeURIComponent(imageUrl)}` : "")
        )}
        className={btn}
        aria-label="Share this project on Pinterest"
      >
        {/* lucide has no Pinterest glyph; the wordmark P is drawn as text so
            the row does not fall back to a generic share icon that says
            nothing about where the click goes. */}
        <span className="font-body text-[15px] leading-none" aria-hidden>
          P
        </span>
      </button>
    </div>
  );
}
