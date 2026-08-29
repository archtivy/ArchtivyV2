"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { FacetValue } from "@/lib/db/projectsDirectory";

/**
 * The filter workspace: one wide panel holding a directory's filters, in
 * columns. Shared by /projects and /products.
 *
 * ── GENERIC OVER THE FILTER SHAPE ───────────────────────────────────────────
 * The caller passes columns — a title, the facet values, which values are
 * currently selected, and what to do when one is toggled — plus anything that
 * is not a checklist (ranges, single toggles) as `extras`. That keeps every
 * decision about WHICH filters exist with the directory that knows its own
 * data, while the panel owns only how a filter workspace looks and behaves.
 * Forking it per directory is how two filter UIs drift apart.
 *
 * A column with no values is dropped by the caller before it gets here, so an
 * empty facet never renders as an empty heading.
 *
 * ── NO APPLY BUTTON ─────────────────────────────────────────────────────────
 * Filtering is instant and writes straight to the URL, which is how both
 * directories already work. An Apply step would be a fake gate in front of a
 * change that has already happened, and it would break the shareable-URL
 * guarantee for anyone who filtered and then navigated away without pressing
 * it.
 *
 * Closes on outside click and on Escape, returns focus to the trigger, and is
 * fully keyboard reachable — it is plain checkboxes and number inputs.
 *
 * On small screens it becomes a full-width sheet pinned to the bottom of the
 * viewport rather than a desktop popover squeezed into 390px: the columns
 * stack, the sheet scrolls, and the close control stays in reach.
 */

export interface FilterColumn {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function DirectoryFilterPanel({
  columns,
  extras,
  activeCount,
  onClear,
  onClose,
  triggerRef,
  title = "Filter",
}: {
  columns: FilterColumn[];
  /** Non-checklist controls: ranges, single toggles. Rendered as a last column. */
  extras?: React.ReactNode;
  activeCount: number;
  onClear: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  title?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    // `click`, not `mousedown`: a mousedown listener closes the panel before a
    // checkbox inside it receives its own click.
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${title} results`}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-xl border border-hairline bg-cream p-5 shadow-[0_-8px_28px_rgba(22,22,22,0.12)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-[calc(100%+8px)] sm:max-h-[70vh] sm:w-[min(1180px,calc(100vw-3rem))] sm:rounded-xl sm:p-6 sm:shadow-[0_8px_28px_rgba(22,22,22,0.10)]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="font-body text-[13px] text-muted">
          {activeCount > 0
            ? `${activeCount} filter${activeCount === 1 ? "" : "s"} applied`
            : title}
        </p>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-stone/50 hover:text-ink"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <div key={col.title} className="min-w-0">
            <h3 className="mb-3 font-body text-[12px] uppercase tracking-[0.08em] text-muted">
              {col.title}
            </h3>
            {/* Long vocabularies scroll inside their column rather than making
                the panel taller than the viewport. Materials alone can run to
                dozens of values. */}
            <ul className="max-h-[210px] space-y-1.5 overflow-y-auto pr-1">
              {col.values.map((v) => {
                const checked = col.selected.includes(v.value);
                return (
                  <li key={v.value}>
                    <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] text-ink">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => col.onToggle(v.value)}
                        className="h-3.5 w-3.5 shrink-0 accent-ink"
                      />
                      <span className="min-w-0 flex-1 truncate">{v.label}</span>
                      <span className="shrink-0 font-body text-[12px] text-muted">{v.count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {extras && <div className="min-w-0 space-y-7">{extras}</div>}
      </div>
    </div>
  );
}

/** A single on/off filter, for facets that are a yes-or-no rather than a list. */
export function FilterToggle({
  title,
  label,
  count,
  checked,
  onChange,
}: {
  title: string;
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 font-body text-[12px] uppercase tracking-[0.08em] text-muted">{title}</h3>
      <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-3.5 w-3.5 shrink-0 accent-ink"
        />
        <span className="min-w-0 flex-1">{label}</span>
        {count !== undefined && (
          <span className="shrink-0 font-body text-[12px] text-muted">{count}</span>
        )}
      </label>
    </div>
  );
}

export function RangeGroup({
  title,
  min,
  max,
  from,
  to,
  onFrom,
  onTo,
}: {
  title: string;
  min: number;
  max: number;
  from: number | null;
  to: number | null;
  onFrom: (v: number | null) => void;
  onTo: (v: number | null) => void;
}) {
  const parse = (raw: string) => (raw.trim() === "" ? null : Number(raw));
  const field =
    "w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none";

  return (
    <div>
      <h3 className="mb-3 font-body text-[12px] uppercase tracking-[0.08em] text-muted">{title}</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={from ?? ""}
          min={min}
          max={max}
          placeholder={String(min)}
          aria-label={`${title} from`}
          onChange={(e) => onFrom(parse(e.target.value))}
          className={field}
        />
        <span className="shrink-0 font-body text-[13px] text-muted">–</span>
        <input
          type="number"
          inputMode="numeric"
          value={to ?? ""}
          min={min}
          max={max}
          placeholder={String(max)}
          aria-label={`${title} to`}
          onChange={(e) => onTo(parse(e.target.value))}
          className={field}
        />
      </div>
    </div>
  );
}
