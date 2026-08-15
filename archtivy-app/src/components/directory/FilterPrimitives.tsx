"use client";

import { useState } from "react";
import { Plus, Minus, Search } from "lucide-react";

/**
 * Shared directory filter primitives.
 *
 * Extracted from the Projects Index rail so the Products Index reuses the exact
 * accordion and checkbox behaviour rather than growing a second copy that can
 * drift (Blueprint §3.6, §10 governance). Both rails import from here; only the
 * facet semantics differ between them.
 */

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export function FilterSection({
  label,
  count,
  defaultOpen = false,
  children,
}: {
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="font-body text-[13px] text-ink">
          {label}
          {typeof count === "number" && <span className="ml-1.5 text-muted">{count}</span>}
        </span>
        {open ? (
          <Minus strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
        ) : (
          <Plus strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
        )}
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export function FilterCheckList({
  values,
  selected,
  onToggle,
  searchPlaceholder,
}: {
  values: FacetValue[];
  selected: string[];
  onToggle: (v: string) => void;
  /**
   * When set, a search-within-filter input is rendered above the list.
   * Optional so the Projects and Products rails keep their existing behaviour
   * unchanged; used by Location on the Designers rail, where the values are a
   * long tail of 17 countries with 1-2 designers each.
   */
  searchPlaceholder?: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  // Selected values always stay visible, so a search cannot hide an active
  // filter and leave the user unable to clear it from the rail.
  const shown = q
    ? values.filter((v) => v.label.toLowerCase().includes(q) || selected.includes(v.value))
    : values;

  return (
    <>
      {searchPlaceholder && (
        <label className="mb-2.5 block">
          <span className="sr-only">{searchPlaceholder}</span>
          <span className="relative block">
            <Search
              strokeWidth={1.5}
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-hairline bg-cream py-1.5 pl-8 pr-2.5 font-body text-[12px] text-ink placeholder:text-muted"
            />
          </span>
        </label>
      )}
      {shown.length === 0 ? (
        <p className="py-1 font-body text-[12px] text-muted">No matches.</p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {shown.map((v) => (
            <li key={v.value}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.includes(v.value)}
                  onChange={() => onToggle(v.value)}
                  className="h-3.5 w-3.5 shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1 truncate font-body text-[13px] text-ink">
                  {v.label}
                </span>
                <span className="font-body text-[12px] text-muted">{v.count}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Active-filter chips with individual removal plus "Clear all". */
export function ActiveFilterChips({
  chips,
  onClearAll,
}: {
  chips: { label: string; clear: () => void }[];
  onClearAll: () => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3 py-1 font-body text-[12px] capitalize text-ink"
        >
          {c.label}
          <span aria-hidden>×</span>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="font-body text-[12px] text-muted underline underline-offset-4 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}

/**
 * Empty result state (Blueprint §17): names the likely culprit and offers a
 * specific action. Never a bare "no results".
 */
export function DirectoryEmptyState({
  noun,
  chips,
  onClearAll,
}: {
  noun: string;
  chips: { label: string; clear: () => void }[];
  onClearAll: () => void;
}) {
  const last = chips[chips.length - 1];
  return (
    <div className="rounded-xl border border-hairline px-6 py-14 text-center">
      <p className="font-body text-[15px] text-ink">No {noun} match these filters.</p>
      <p className="mx-auto mt-2 max-w-[44ch] font-body text-[13px] leading-[20px] text-muted">
        {chips.length > 1
          ? "The combination is narrower than the archive currently covers. Try removing one filter."
          : `Nothing in the archive matches yet.`}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {last && (
          <button
            type="button"
            onClick={last.clear}
            className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] capitalize text-ink transition-colors hover:bg-stone/50"
          >
            Remove “{last.label}”
          </button>
        )}
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-full bg-ink px-4 py-2 font-body text-[13px] text-cream transition-opacity hover:opacity-90"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
