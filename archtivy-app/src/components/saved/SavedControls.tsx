"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
import {
  savedHref,
  hasActiveFilters,
  SAVED_SORTS,
  SAVED_TYPES,
  SAVED_WINDOWS,
  type SavedParams,
  type SavedSort,
  type SavedType,
  type SavedWindow,
} from "@/lib/saved/params";
import type { SavedBoard } from "@/lib/db/savedLibrary";

/**
 * The toolbar: search, three filters, Clear all, and sort on the right.
 *
 * ── SAVED FILTERS, NOT FILE FILTERS ─────────────────────────────────────────
 * The reference's row is File type / Source / Brand / Project / Date. Four of
 * those five describe a DOCUMENT and have no column on a saved listing. They
 * are not translated into lookalikes; the row carries the three axes a save
 * actually records:
 *
 *   Type         entity_type on folder_items — project or product
 *   Board        which of the user's folders hold it
 *   Date saved   folder_items.created_at, a real timestamp on every row
 *
 * ── URL-BACKED, DEBOUNCED, NOT A SECOND SOURCE OF TRUTH ─────────────────────
 * The input is seeded from the URL and pushes back to it 300ms after typing
 * stops. The server does the filtering, so refresh and back/forward restore the
 * exact result set and a filtered library is a shareable link. The local
 * `value` exists only so typing is not one round trip per keystroke; it
 * re-syncs whenever the URL changes underneath it (Clear all, the rail, the
 * browser back button), which is what stops the two drifting.
 *
 * ── NO GRID/LIST TOGGLE ─────────────────────────────────────────────────────
 * The reference has one. Saved is a mixed grid of canonical project and product
 * cards, and a list view would need a genuinely different mixed-entity row —
 * thumbnail, type, studio or brand, saved date, boards — which is real
 * architecture, not a CSS switch. The brief is explicit that a dead control is
 * worse than an absent one, so there is none until that row exists.
 */
export function SavedControls({
  params,
  boards,
}: {
  params: SavedParams;
  boards: SavedBoard[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(params.q);
  const seeded = useRef(params.q);

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

  const boardOptions = [
    { value: "", label: "All boards" },
    ...boards.map((b) => ({ value: b.id, label: b.name })),
  ];
  const boardLabel =
    boards.find((b) => b.id === params.board)?.name ?? "All boards";
  const sortLabel = SAVED_SORTS.find((s) => s.value === params.sort)?.label ?? "Newest added";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* First and widest, as the reference has it. Capped so it does not eat
          the whole row on a 1600px main column, where the pills would then
          float alone at the far right. */}
      <div className="relative min-w-[200px] flex-1 lg:max-w-[380px]">
        <Search
          strokeWidth={1.5}
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
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
          className="h-10 w-full rounded-full border border-hairline bg-cream pl-11 pr-4 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
        />
      </div>

      <SelectPill
        label={SAVED_TYPES.find((t) => t.value === params.type)!.label}
        value={params.type}
        options={SAVED_TYPES}
        onChange={(v) => go({ ...params, type: v as SavedType })}
        srLabel="Filter by type"
      />

      {/* Only when the user has boards — an "All boards" select over nothing
          is a control that cannot change anything. */}
      {boards.length > 0 && (
        <SelectPill
          label={boardLabel}
          value={params.board ?? ""}
          options={boardOptions}
          onChange={(v) => go({ ...params, board: v || null })}
          srLabel="Filter by board"
        />
      )}

      <SelectPill
        label={SAVED_WINDOWS.find((w) => w.value === params.window)!.label}
        value={params.window}
        options={SAVED_WINDOWS}
        onChange={(v) => go({ ...params, window: v as SavedWindow })}
        srLabel="Filter by date saved"
      />

      {/* Only when something is actually on. */}
      {hasActiveFilters(params) && (
        <Link
          href={savedHref({
            q: "",
            type: "all",
            sort: "newest",
            window: "all",
            // The board is navigation, so Clear all must not move you out of
            // the board you opened.
            board: params.board,
          })}
          scroll={false}
          className="px-1 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Clear all
        </Link>
      )}

      <span className="ml-auto">
        <SelectPill
          label={sortLabel}
          value={params.sort}
          options={SAVED_SORTS}
          onChange={(v) => go({ ...params, sort: v as SavedSort })}
          srLabel="Sort saved items"
        />
      </span>
    </div>
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
    <span className="relative inline-flex h-10 max-w-[180px] items-center rounded-full border border-hairline bg-cream pl-4 pr-8 font-body text-[13px] text-ink">
      <span className="truncate">{label}</span>
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
