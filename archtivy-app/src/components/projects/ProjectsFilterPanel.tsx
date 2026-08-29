"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { DirectoryFacets } from "@/lib/db/projectsDirectory";
import { EMPTY_FILTERS, countActiveFilters, type FilterState } from "@/lib/projects/directoryParams";

/**
 * The filter workspace: one wide panel holding every filter the projects
 * directory has, in columns.
 *
 * ── SAME FILTERS, ONE PLACE ─────────────────────────────────────────────────
 * These are the eight filters the page already had, moved out of the left rail
 * and the mobile drawer that duplicated it. Nothing was added, nothing was
 * dropped, and no second filtering system exists: the rail's FilterState is
 * now lib/projects/directoryParams, and this panel and the results grid read
 * the same object out of the URL.
 *
 *   Category       project taxonomy roots
 *   Location       country
 *   Project Type   intervention_type — renovation, restoration, new build
 *   Style          style taxonomy
 *   Materials      the materials table
 *   Year           min / max, bounded by the real range
 *   Size           min / max ft², bounded by the real range
 *   With products  projects carrying at least one product link
 *
 * Every option is a real facet value with a real count, computed server-side
 * in getProjectsDirectory. A facet with no values renders no column at all
 * rather than an empty heading — `sustainability`, for instance, has zero
 * project facets and has never appeared here.
 *
 * ── NO APPLY BUTTON ─────────────────────────────────────────────────────────
 * Filtering is instant and writes straight to the URL, which is how the page
 * already worked. An Apply step would be a fake gate in front of a change that
 * has already happened, and it would break the shareable-URL guarantee for
 * anyone who filtered and then navigated away without pressing it.
 *
 * Closes on outside click and on Escape, returns focus to the trigger, and is
 * fully keyboard reachable — it is plain checkboxes and number inputs.
 */
export function ProjectsFilterPanel({
  facets,
  filters,
  onChange,
  onClose,
  triggerRef,
}: {
  facets: DirectoryFacets;
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
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

  const toggle = (key: "buildingTypes" | "locations" | "projectTypes" | "styles" | "materials", value: string) => {
    const cur = filters[key] as string[];
    onChange({
      ...filters,
      [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    });
  };

  const active = countActiveFilters(filters);

  type ListKey = "buildingTypes" | "locations" | "projectTypes" | "styles" | "materials";
  const columns: { title: string; key: ListKey; values: typeof facets.locations }[] = (
    [
      { title: "Category", key: "buildingTypes", values: facets.buildingTypes },
      { title: "Location", key: "locations", values: facets.locations },
      { title: "Project Type", key: "projectTypes", values: facets.projectTypes },
      { title: "Style", key: "styles", values: facets.styles },
      { title: "Materials", key: "materials", values: facets.materials },
    ] as { title: string; key: ListKey; values: typeof facets.locations }[]
  ).filter((c) => c.values.length > 0);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Filter projects"
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto rounded-xl border border-hairline bg-cream p-6 shadow-[0_8px_28px_rgba(22,22,22,0.10)] sm:right-auto sm:w-[min(1100px,calc(100vw-3rem))]"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="font-body text-[13px] text-muted">
          {active > 0 ? `${active} filter${active === 1 ? "" : "s"} applied` : "Filter projects"}
        </p>
        <div className="flex items-center gap-3">
          {active > 0 && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_FILTERS)}
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
                const checked = (filters[col.key] as string[]).includes(v.value);
                return (
                  <li key={v.value}>
                    <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] text-ink">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(col.key, v.value)}
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

        <div className="min-w-0 space-y-7">
          {facets.yearRange && (
            <RangeGroup
              title="Year"
              min={facets.yearRange.min}
              max={facets.yearRange.max}
              from={filters.yearMin}
              to={filters.yearMax}
              onFrom={(v) => onChange({ ...filters, yearMin: v })}
              onTo={(v) => onChange({ ...filters, yearMax: v })}
            />
          )}

          {facets.areaRange && (
            <RangeGroup
              title="Size (ft²)"
              min={facets.areaRange.min}
              max={facets.areaRange.max}
              from={filters.areaMin}
              to={filters.areaMax}
              onFrom={(v) => onChange({ ...filters, areaMin: v })}
              onTo={(v) => onChange({ ...filters, areaMax: v })}
            />
          )}

          {facets.projectsWithProducts > 0 && (
            <div>
              <h3 className="mb-3 font-body text-[12px] uppercase tracking-[0.08em] text-muted">
                Products
              </h3>
              <label className="flex cursor-pointer items-center gap-2.5 font-body text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={filters.withProductsOnly}
                  onChange={() =>
                    onChange({ ...filters, withProductsOnly: !filters.withProductsOnly })
                  }
                  className="h-3.5 w-3.5 shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1">With products specified</span>
                <span className="shrink-0 font-body text-[12px] text-muted">
                  {facets.projectsWithProducts}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RangeGroup({
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
