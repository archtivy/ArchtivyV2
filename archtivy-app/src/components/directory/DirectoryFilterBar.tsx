"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 * ── THE SEARCH BOX TYPES LOCALLY AND SYNCS ON A DEBOUNCE ────────────────────
 * `q` arrives from the server: the page parses searchParams, hands down the
 * parsed state, and the input rendered `value={q}` directly. So every
 * keystroke had to complete a router.replace and a server round-trip before it
 * could appear, and React re-rendered the controlled input back to the STALE
 * prop in the meantime — which discarded the characters typed during the trip.
 * Measured identically on /projects and on a category archive: typing "house"
 * at speed left `?q=e` in the URL and a single "e" in the box. Four of five
 * characters lost.
 *
 * The input is now driven by local `draft` state, so typing is instant and
 * nothing can overwrite it mid-word. The URL is written 250ms after the last
 * keystroke, which keeps every guarantee the URL-as-state design depends on:
 * the address bar is shareable, a fresh request to it renders the same results
 * server-side, and the crawler still sees a real result set in the HTML.
 *
 * `pushedRef` is what separates OUR echo from a change that came from
 * somewhere else. When the prop settles to the value we just wrote, the two
 * match and the draft is left alone; when it differs — Back/Forward, "Clear
 * all", removing a chip — it is an outside edit and the draft is reset to it.
 * Without that distinction the effect would either fight the user's typing or
 * ignore the Back button.
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
  const [draft, setDraft] = useState(q);

  /*
   * The last value THIS component wrote to the URL. See the note above: it is
   * the only way to tell our own echo from an outside change.
   */
  const pushedRef = useRef(q);

  /*
   * onQueryChange is rebuilt on every parent render (it closes over the current
   * filters), so depending on it directly would restart the debounce timer
   * whenever the parent re-rendered — including on the server response to the
   * previous keystroke. Held in a ref, the timer below depends on `draft`
   * alone while still calling the newest callback.
   */
  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;

  useEffect(() => {
    if (q === pushedRef.current) return;
    // Came from outside — Back/Forward, "Clear all", a removed chip.
    pushedRef.current = q;
    setDraft(q);
  }, [q]);

  useEffect(() => {
    if (draft === pushedRef.current) return;
    const t = setTimeout(() => {
      pushedRef.current = draft;
      onQueryChangeRef.current(draft);
    }, 250);
    return () => clearTimeout(t);
  }, [draft]);

  /* Clearing is a deliberate act, not typing: it applies immediately. */
  const clearQuery = useCallback(() => {
    pushedRef.current = "";
    setDraft("");
    onQueryChangeRef.current("");
  }, []);

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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="h-12 w-full rounded-full border border-hairline bg-cream pl-12 pr-11 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none"
          />
          {draft && (
            <button
              type="button"
              onClick={clearQuery}
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
