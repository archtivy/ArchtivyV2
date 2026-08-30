"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ChevronDown } from "lucide-react";
import {
  savedHref,
  hasActiveFilters,
  SAVED_SORTS,
  SAVED_TYPES,
  type SavedParams,
  type SavedSort,
  type SavedType,
} from "@/lib/saved/params";

/**
 * Search, sort and the active-filter chips.
 *
 * ── URL-BACKED, DEBOUNCED, AND NOT A SECOND SOURCE OF TRUTH ─────────────────
 * The input is seeded from the URL and pushes back to it 300ms after typing
 * stops. The server does the filtering, so refresh and back/forward restore
 * the exact result set and a filtered library is a shareable link.
 *
 * The local `value` exists only so typing is not one round trip per keystroke;
 * it re-syncs whenever the URL changes underneath it (a chip dismissed, Clear
 * all, the browser back button), which is what stops the two drifting.
 *
 * ── NO VIEW TOGGLE ──────────────────────────────────────────────────────────
 * The reference has grid/list. Saved is a mixed grid of canonical project and
 * product cards, and a list view of it would need a genuinely different mixed
 * -entity row — thumbnail, type, studio or brand, saved date, boards — which is
 * real architecture, not a CSS switch. A dead toggle is worse than no toggle,
 * so there is none until that row exists.
 */
export function SavedControls({
  params,
  boardName,
}: {
  params: SavedParams;
  boardName: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(params.q);
  const seeded = useRef(params.q);

  // Re-seed when the URL's q changes from anywhere that is not this input.
  useEffect(() => {
    if (params.q !== seeded.current) {
      seeded.current = params.q;
      setValue(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    if (value === params.q) return;
    const t = setTimeout(() => {
      seeded.current = value;
      router.push(savedHref({ ...params, q: value }), { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // params is re-created each render; q is the piece that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const go = (next: SavedParams) => router.push(savedHref(next), { scroll: false });

  const typeLabel = SAVED_TYPES.find((t) => t.value === params.type)?.label ?? "All types";
  const sortLabel = SAVED_SORTS.find((s) => s.value === params.sort)?.label ?? "Newest saved";
  const showChips = hasActiveFilters(params);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            strokeWidth={1.5}
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="saved-search" className="sr-only">
            Search your saved library
          </label>
          <input
            id="saved-search"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search saved projects, products..."
            className="h-12 w-full rounded-xl border border-hairline bg-cream pl-12 pr-4 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SelectPill
            label={`Sort by: ${sortLabel}`}
            value={params.sort}
            options={SAVED_SORTS}
            onChange={(v) => go({ ...params, sort: v as SavedSort })}
            srLabel="Sort saved items"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SelectPill
          label={typeLabel}
          value={params.type}
          options={SAVED_TYPES}
          onChange={(v) => go({ ...params, type: v as SavedType })}
          srLabel="Filter by type"
        />

        {/* Active filters as removable chips, exactly as the reference shows.
            The board is NOT a chip: it is navigation, and dismissing it here
            would silently move you out of the board you opened. */}
        {params.q && (
          <Chip label={`"${params.q}"`} onClear={() => go({ ...params, q: "" })} />
        )}
        {params.type !== "all" && (
          <Chip
            label={SAVED_TYPES.find((t) => t.value === params.type)!.label}
            onClear={() => go({ ...params, type: "all" })}
          />
        )}
        {params.sort !== "newest" && (
          <Chip label={sortLabel} onClear={() => go({ ...params, sort: "newest" })} />
        )}

        {showChips && (
          <Link
            href={savedHref({ q: "", type: "all", sort: "newest", board: params.board })}
            scroll={false}
            className="ml-1 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </Link>
        )}

        {boardName && (
          <span className="ml-auto font-body text-[13px] text-muted">
            in <span className="text-ink">{boardName}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-cream px-3.5 font-body text-[13px] text-ink">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="text-muted transition-colors hover:text-ink"
      >
        <X strokeWidth={1.5} className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/** A native select wearing the reference's pill, so it stays keyboard-native. */
function SelectPill({
  label,
  value,
  options,
  onChange,
  srLabel,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  srLabel: string;
}) {
  return (
    <span className="relative inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-cream pl-3.5 pr-8 font-body text-[13px] text-ink">
      {label}
      <ChevronDown
        strokeWidth={1.5}
        className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-muted"
        aria-hidden
      />
      <select
        aria-label={srLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
