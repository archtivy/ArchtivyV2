"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ChevronDown } from "lucide-react";
import {
  filesHref,
  hasActiveFileFilters,
  FILE_SORTS,
  FILE_WINDOWS,
  type FilesParams,
  type FileSort,
  type FileWindow,
} from "@/lib/files/params";
import type { FacetValue } from "@/components/files/FilesSidebar";

/**
 * Search, sort, and the active-filter chips.
 *
 * ── NO GRID / LIST TOGGLE ───────────────────────────────────────────────────
 * The reference has one. A grid of files needs thumbnails, and
 * listing_documents.preview_image_path is NULL on all 61 rows — a grid would
 * be a wall of identical generic file icons, strictly worse than the table at
 * the one job this page has. The toggle is omitted rather than shipped dead.
 * If previews are ever generated, the grid becomes worth building.
 *
 * Search and every filter are URL state applied on the server, so the first
 * paint is already filtered and back/forward restore it exactly.
 */
export function FilesControls({
  params,
  sources,
}: {
  params: FilesParams;
  sources: FacetValue[];
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
      router.push(filesHref({ ...params, q: value }), { scroll: false });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const go = (next: FilesParams) => router.push(filesHref(next), { scroll: false });

  const sortLabel = FILE_SORTS.find((s) => s.value === params.sort)?.label ?? "Newest";
  const windowLabel = FILE_WINDOWS.find((w) => w.value === params.window)?.label ?? "Any time";
  const sourceLabel =
    params.source === "all"
      ? "All sources"
      : sources.find((s) => s.value === params.source)?.label ?? "Source";

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            strokeWidth={1.5}
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <label htmlFor="files-search" className="sr-only">
            Search your files
          </label>
          <input
            id="files-search"
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search by file name, source, listing..."
            className="h-12 w-full rounded-xl border border-hairline bg-cream pl-12 pr-4 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
          />
        </div>
        <SelectPill
          label={`Sort by: ${sortLabel}`}
          value={params.sort}
          options={FILE_SORTS}
          onChange={(v) => go({ ...params, sort: v as FileSort })}
          srLabel="Sort files"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SelectPill
          label={windowLabel}
          value={params.window}
          options={FILE_WINDOWS}
          onChange={(v) => go({ ...params, window: v as FileWindow })}
          srLabel="Filter by download date"
        />
        {sources.length > 1 && (
          <SelectPill
            label={sourceLabel}
            value={params.source}
            options={[
              { value: "all", label: "All sources" },
              ...sources.map((s) => ({ value: s.value, label: s.label })),
            ]}
            onChange={(v) => go({ ...params, source: v })}
            srLabel="Filter by source"
          />
        )}

        {params.q && <Chip label={`"${params.q}"`} onClear={() => go({ ...params, q: "" })} />}
        {params.format !== "all" && (
          <Chip label={params.format} onClear={() => go({ ...params, format: "all" })} />
        )}
        {params.window !== "all" && (
          <Chip label={windowLabel} onClear={() => go({ ...params, window: "all" })} />
        )}
        {params.source !== "all" && (
          <Chip label={sourceLabel} onClear={() => go({ ...params, source: "all" })} />
        )}

        {hasActiveFileFilters(params) && (
          <Link
            href={filesHref({ q: "", format: "all", source: "all", window: "all", sort: params.sort })}
            scroll={false}
            className="ml-1 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </Link>
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

/** Native select wearing the reference's pill, so it stays keyboard-native. */
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
    <span className="relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-hairline bg-cream pl-3.5 pr-8 font-body text-[13px] text-ink">
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
