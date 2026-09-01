"use client";

import { ChevronDown, Search, X } from "lucide-react";

/**
 * The compact directory head: heading + count, a wide search, sort on the
 * right, and a row of filter pills beneath.
 *
 * ── IT OWNS THE h1 ONLY WHERE THERE ISN'T ONE ───────────────────────────────
 * On /projects and /products the heading moved off the page and into this bar,
 * so the title and the result count sit on one line as in the reference.
 *
 * On a category archive it must NOT: ArchiveHeader already renders that page's
 * h1 ("Single-Family House Projects") above this bar, and emitting a second one
 * is a document-outline regression — measured at 2 per archive page before this
 * was split. `heading` is null there and the bar shows the count alone, which
 * is also the honest reading: the archive header has already said what the page
 * is, and repeating the category name under it says nothing new.
 *
 * ── PILLS ARE PASSED IN, NOT DEFINED HERE ───────────────────────────────────
 * Projects and products do not have the same facets and are not forced to: the
 * bar lays out whatever pills its caller gives it. That is why there is one
 * shell rather than two near-identical bars, and no shared "facet" abstraction
 * pretending a brand and a studio are the same kind of thing.
 */
export function DirectoryFilterBar({
  heading,
  title,
  countLabel,
  q,
  onQueryChange,
  searchPlaceholder,
  searchLabel,
  sortOptions,
  sort,
  onSortChange,
  pills,
  chips,
  onClearAll,
}: {
  /** The page h1. Null on archive routes, where ArchiveHeader owns it. */
  heading: string | null;
  /** Used for the sort control's accessible name whether or not it is shown. */
  title: string;
  /** e.g. "53 projects found" — already pluralised by the caller. */
  countLabel: string;
  q: string;
  onQueryChange: (v: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  sortOptions: readonly { key: string; label: string }[];
  sort: string;
  onSortChange: (v: string) => void;
  pills: React.ReactNode;
  /** Active filters, individually removable. Empty renders nothing. */
  chips: { label: string; clear: () => void }[];
  onClearAll: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {heading && (
          <h1 className="font-display text-[28px] leading-none tracking-tight text-ink sm:text-[32px]">
            {heading}
          </h1>
        )}
        <p className="font-body text-[14px] text-muted">{countLabel}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            strokeWidth={1.5}
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="h-12 w-full rounded-full border border-hairline bg-cream pl-12 pr-11 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-ink"
            >
              <X strokeWidth={1.5} className="h-4 w-4" />
            </button>
          )}
        </div>

        <label className="relative shrink-0">
          <span className="sr-only">{`Sort ${title.toLowerCase()}`}</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-12 appearance-none rounded-full border border-hairline bg-cream pl-5 pr-11 font-body text-[14px] text-ink focus:border-ink/40 focus:outline-none"
          >
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown
            strokeWidth={1.5}
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
        </label>
      </div>

      {/* Scrolls rather than wrapping into a ragged block on narrow screens. */}
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pills}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c, i) => (
            <button
              key={`${c.label}-${i}`}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone/50 px-3 py-1.5 font-body text-[13px] text-ink transition-colors hover:bg-stone"
            >
              {c.label}
              <X strokeWidth={1.5} className="h-3.5 w-3.5 text-muted" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
