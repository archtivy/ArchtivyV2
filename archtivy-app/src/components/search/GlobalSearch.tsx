"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useAnimatedPlaceholder } from "@/lib/hooks/useAnimatedPlaceholder";

/**
 * The global search field.
 *
 * ── ONE FIELD, EVERY SURFACE ────────────────────────────────────────────────
 * Mounted once inside HomeNav, which is the header on sixteen surfaces —
 * project and product detail, designer and brand profiles, the directories,
 * inspiration, magazine and the corporate pages — and again in the workspace
 * bar. There is no per-page search anywhere; changing behaviour here changes
 * it everywhere, which is the point.
 *
 * ── IT SEARCHES EVERYTHING, NOT THE PAGE YOU ARE ON ─────────────────────────
 * This field used to infer an entity type from the current pathname and push
 * to that directory: `/explore/products?q=…` on two paths, `/explore/projects`
 * on every other. So a search for "chair" from the homepage, a magazine
 * article or a studio profile landed in Projects — and designers and brands
 * could not be reached by search at all, because no pathname mapped to them.
 *
 * It now submits to `/search?q=…`, which queries projects, products, designers
 * and brands together and ranks them against each other. Where you happened to
 * be standing is no longer taken as a statement about what you were looking
 * for.
 *
 * The directories keep their own in-page search — the field in
 * DirectoryFilterBar on /projects and /products, which narrows the set already
 * on screen. That is a different job and it is untouched.
 */

export interface GlobalSearchProps {
  /**
   * `bar`   — the wide header field.
   * `inline` — the compact workspace variant.
   */
  size?: "bar" | "inline";
  /** Cream-on-dark, for the transparent header over the homepage hero. */
  onDark?: boolean;
  /**
   * Rendered but not reachable. Set while the field is the faded-out half of
   * the homepage masthead cross-fade: it stays in the DOM so the two states
   * can transition, and must not be tabbable or animate a placeholder nobody
   * can see while it is there.
   */
  inert?: boolean;
  className?: string;
}

export function GlobalSearch({
  size = "bar",
  onDark = false,
  inert = false,
  className = "",
}: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  /*
   * The animation runs only while the field is genuinely idle: not focused and
   * empty. Focusing stops it on the same tick, and blurring an empty field
   * lets it resume.
   */
  const placeholder = useAnimatedPlaceholder({
    active: !inert && !focused && query.length === 0,
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      // An empty submit is a no-op rather than a trip to an empty results
      // page. Previously it navigated to the projects directory, which is a
      // strange thing for pressing Enter in a blank field to do.
      if (!q) {
        inputRef.current?.focus();
        return;
      }
      router.push(`/search?q=${encodeURIComponent(q)}`);
      inputRef.current?.blur();
    },
    [query, router]
  );

  const inline = size === "inline";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`w-full ${className}`.trim()}
    >
      {/*
        ── AN OUTLINE, NOT A FILLED BOX ──────────────────────────────────────
        No fill at rest: the field is a hairline drawn on the cream, the same
        way the "For Professionals" control beside it is drawn, so the bar
        reads as one system rather than a page with a widget dropped into it.
        A pale grey rounded rectangle is the search treatment every product
        already uses, and it is the one thing this header should not look like.

        The white ground appears only on focus, where it does real work —
        marking the field as live and lifting the typed value off the page.
      */}
      <div
        className={[
          "flex items-center gap-3 rounded-full border transition-colors duration-200",
          inline ? "h-10 px-4" : "h-11 px-5",
          onDark
            ? focused
              ? "border-cream/60 bg-cream/[0.12]"
              : "border-cream/25 hover:border-cream/45"
            : focused
              ? "border-ink/40 bg-white"
              : "border-ink/15 hover:border-ink/30",
        ].join(" ")}
      >
        <Search
          strokeWidth={1.5}
          className={[
            "h-[18px] w-[18px] shrink-0 transition-colors",
            onDark ? "text-cream/60" : "text-muted",
          ].join(" ")}
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete="off"
          tabIndex={inert ? -1 : undefined}
          aria-label="Search Archtivy"
          className={[
            "min-w-0 flex-1 bg-transparent font-body outline-none",
            inline ? "text-[14px]" : "text-[15px]",
            // `search` inputs get a UA clear button in WebKit that sits badly
            // against a hairline field.
            "[&::-webkit-search-cancel-button]:appearance-none",
            onDark
              ? "text-cream placeholder:text-cream/45"
              : "text-ink placeholder:text-muted/80",
          ].join(" ")}
        />

        {/*
          ── IMPLICIT SUBMISSION NEEDS A SUBMIT BUTTON ────────────────────────
          Without one, pressing Enter in the field did nothing — verified in a
          browser: the query stayed put and the route never changed. A form
          with no submit button only submits implicitly under conditions that
          are not worth relying on, and a search box that ignores Enter is
          broken in the most basic way available.

          Visually hidden rather than drawn, because the field is already a
          complete affordance; it also gives keyboard and screen-reader users
          a real, labelled control to reach.
        */}
        <button type="submit" tabIndex={inert ? -1 : undefined} className="sr-only">
          Search
        </button>
      </div>
    </form>
  );
}
