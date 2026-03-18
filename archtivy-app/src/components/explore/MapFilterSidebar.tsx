"use client";

import { useCallback, useState } from "react";
import type { PinType } from "./ExploreMapView";

/* ═══════════════════════════════════════════════════════════════════════════ */

const COLORS: Record<PinType, string> = {
  project: "#002abf",
  product: "#059669",
  designer: "#7c3aed",
  brand: "#d4a017",
};

/** Primary pin types shown in the filter sidebar (products excluded). */
const MAP_PIN_TYPES: PinType[] = ["project", "designer", "brand"];

const LABELS: Record<PinType, string> = {
  project: "Projects",
  product: "Products",
  designer: "Designers",
  brand: "Brands",
};

const PROJECT_TYPES = ["Residential", "Commercial", "Hospitality", "Cultural", "Interior", "Institutional", "Mixed-Use"];
const MATERIALS = ["Concrete", "Wood", "Glass", "Steel", "Stone", "Brick", "Ceramic"];
const STYLES = ["Minimal", "Brutalist", "Scandinavian", "Modern", "Industrial", "Art Deco", "Parametric"];

/* ═══════════════════════════════════════════════════════════════════════════ */

interface MapFilterSidebarProps {
  filters: Set<PinType>;
  onToggleFilter: (type: PinType) => void;
  nearYouActive: boolean;
  onToggleNearYou: () => void;
  nearYouCount: number;
  pinCounts: Record<PinType, number>;
  totalVisible: number;
  // Advanced filters
  selectedProjectTypes: Set<string>;
  onToggleProjectType: (t: string) => void;
  selectedMaterials: Set<string>;
  onToggleMaterial: (m: string) => void;
  selectedStyles: Set<string>;
  onToggleStyle: (s: string) => void;
  yearRange: [number, number];
  onYearRangeChange: (range: [number, number]) => void;
  // Location
  userLocation: { lat: number; lng: number } | null | undefined;
  locationDenied: boolean;
  onRequestLocation: () => void;
  onRecenter: () => void;
  onClearLocation: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

function FilterSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {title}
          </h3>
          {count != null && count > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#002abf] px-1 text-[9px] font-bold text-white">
              {count}
            </span>
          )}
        </div>
        <svg
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

function MultiSelect({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: Set<string>;
  onToggle: (item: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = selected.has(item);
        return (
          <button
            key={item}
            onClick={() => onToggle(item)}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-50"
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                active
                  ? "border-[#002abf] bg-[#002abf]"
                  : "border-zinc-300 bg-white"
              }`}
            >
              {active && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </span>
            <span className={`text-xs ${active ? "font-medium text-zinc-900" : "text-zinc-600"}`}>
              {item}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export function MapFilterSidebar({
  filters,
  onToggleFilter,
  nearYouActive,
  onToggleNearYou,
  nearYouCount,
  pinCounts,
  totalVisible,
  selectedProjectTypes,
  onToggleProjectType,
  selectedMaterials,
  onToggleMaterial,
  selectedStyles,
  onToggleStyle,
  yearRange,
  onYearRangeChange,
  userLocation,
  locationDenied,
  onRequestLocation,
  onRecenter,
  onClearLocation,
}: MapFilterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleSelectAll = useCallback(() => {
    for (const t of MAP_PIN_TYPES) {
      if (!filters.has(t)) onToggleFilter(t);
    }
  }, [filters, onToggleFilter]);

  const activeFilterCount =
    selectedProjectTypes.size + selectedMaterials.size + selectedStyles.size +
    (yearRange[0] !== 1990 || yearRange[1] !== 2025 ? 1 : 0);

  const allActive = MAP_PIN_TYPES.every((t) => filters.has(t));

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 top-0 z-20 hidden flex-col border-r border-zinc-200/60 bg-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex ${
          collapsed ? "w-[52px]" : "w-[320px]"
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-4 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-200/60 transition-colors hover:bg-zinc-50"
        >
          <svg
            className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Collapsed: icon strip */}
        {collapsed && (
          <div className="flex flex-1 flex-col items-center gap-3 pt-6">
            {MAP_PIN_TYPES.map((type) => {
              const active = filters.has(type);
              return (
                <button
                  key={type}
                  onClick={() => onToggleFilter(type)}
                  title={LABELS[type]}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    active ? "bg-zinc-100 ring-1 ring-zinc-200/80" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLORS[type] }} />
                </button>
              );
            })}
            <span className="my-1 h-px w-5 bg-zinc-200/80" />
            <button
              onClick={onToggleNearYou}
              title="Near You"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                nearYouActive ? "bg-[#002abf] text-white" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="8" cy="8" r="3" />
                <circle cx="8" cy="8" r="6.5" />
              </svg>
            </button>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#002abf] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </div>
        )}

        {/* Expanded */}
        {!collapsed && (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                <h2 className="text-sm font-semibold text-zinc-900">Filters</h2>
              </div>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-500">
                {totalVisible.toLocaleString()}
              </span>
            </div>

            {/* ── Pin Types — compact segmented control ─────────────────── */}
            <div className="border-b border-zinc-100 px-5 py-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Show on map
                </h3>
                {!allActive && (
                  <button
                    onClick={handleSelectAll}
                    className="text-[10px] font-medium text-[#002abf] transition-colors hover:text-[#0022a0]"
                  >
                    All
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-50 p-1 ring-1 ring-zinc-200/60">
                {MAP_PIN_TYPES.map((type) => {
                  const active = filters.has(type);
                  const count = pinCounts[type] ?? 0;
                  return (
                    <button
                      key={type}
                      onClick={() => onToggleFilter(type)}
                      className={`flex flex-col items-center gap-0.5 rounded-md px-1.5 py-2 text-center transition-all ${
                        active
                          ? "bg-white shadow-sm ring-1 ring-zinc-200/80"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full transition-opacity"
                        style={{ background: COLORS[type], opacity: active ? 1 : 0.35 }}
                      />
                      <span className={`text-[11px] font-medium leading-tight ${active ? "text-zinc-900" : ""}`}>
                        {LABELS[type]}
                      </span>
                      <span className={`text-[10px] tabular-nums leading-tight ${active ? "text-zinc-500" : "text-zinc-300"}`}>
                        {count.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Near You / Location ──────────────────────────────────── */}
            <div className="border-b border-zinc-100 px-5 py-3.5">
              <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Near You
              </h3>

              {!userLocation && !locationDenied && (
                <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
                  <p className="text-xs text-zinc-500">
                    Enable your location to discover architecture, studios, and brands nearby.
                  </p>
                  <button
                    onClick={onRequestLocation}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#002abf] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0022a0]"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="8" cy="8" r="3" />
                      <circle cx="8" cy="8" r="6.5" />
                      <line x1="8" y1="0" x2="8" y2="3" />
                      <line x1="8" y1="13" x2="8" y2="16" />
                      <line x1="0" y1="8" x2="3" y2="8" />
                      <line x1="13" y1="8" x2="16" y2="8" />
                    </svg>
                    Enable location
                  </button>
                </div>
              )}

              {locationDenied && !userLocation && (
                <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
                  <p className="text-xs text-zinc-500">
                    Location access was denied. You can enable it in your browser settings.
                  </p>
                </div>
              )}

              {userLocation && (
                <div className="space-y-2">
                  <button
                    onClick={onToggleNearYou}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                      nearYouActive ? "bg-[#002abf]/5 ring-1 ring-[#002abf]/20" : "bg-zinc-50 ring-1 ring-zinc-100 hover:bg-zinc-100"
                    }`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                      nearYouActive ? "bg-[#002abf] text-white" : "bg-zinc-200 text-zinc-500"
                    }`}>
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="8" cy="8" r="3" />
                        <circle cx="8" cy="8" r="6.5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-800">
                        {nearYouActive ? `${nearYouCount} within 150 km` : "Filter to 150 km radius"}
                      </div>
                    </div>
                    <span className={`flex h-3.5 w-6 items-center rounded-full px-0.5 transition-colors ${nearYouActive ? "bg-[#002abf]" : "bg-zinc-200"}`}>
                      <span className={`h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform ${nearYouActive ? "translate-x-2.5" : "translate-x-0"}`} />
                    </span>
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={onRecenter}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-50 px-2 py-1.5 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200/60 transition-colors hover:bg-zinc-100"
                    >
                      <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <circle cx="8" cy="8" r="2.5" fill="currentColor" opacity={0.2} />
                        <circle cx="8" cy="8" r="5.5" />
                      </svg>
                      Re-center
                    </button>
                    <button
                      onClick={onClearLocation}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-zinc-50 px-2 py-1.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200/60 transition-colors hover:bg-zinc-100"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Project Type ────────────────────────────────────────── */}
            <FilterSection title="Project Type" count={selectedProjectTypes.size}>
              <MultiSelect items={PROJECT_TYPES} selected={selectedProjectTypes} onToggle={onToggleProjectType} />
            </FilterSection>

            {/* ── Materials ───────────────────────────────────────────── */}
            <FilterSection title="Materials" count={selectedMaterials.size}>
              <MultiSelect items={MATERIALS} selected={selectedMaterials} onToggle={onToggleMaterial} />
            </FilterSection>

            {/* ── Style ──────────────────────────────────────────────── */}
            <FilterSection title="Style" count={selectedStyles.size}>
              <MultiSelect items={STYLES} selected={selectedStyles} onToggle={onToggleStyle} />
            </FilterSection>

            {/* ── Year ───────────────────────────────────────────────── */}
            <FilterSection title="Year" count={yearRange[0] !== 1990 || yearRange[1] !== 2025 ? 1 : 0}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-medium text-zinc-400">From</label>
                    <input
                      type="number"
                      min={1990}
                      max={yearRange[1]}
                      value={yearRange[0]}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) onYearRangeChange([Math.min(v, yearRange[1]), yearRange[1]]);
                      }}
                      className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm tabular-nums text-zinc-800 outline-none focus:border-[#002abf]/40 focus:ring-1 focus:ring-[#002abf]/20"
                    />
                  </div>
                  <span className="mt-4 text-zinc-300">—</span>
                  <div className="flex-1">
                    <label className="mb-1 block text-[10px] font-medium text-zinc-400">To</label>
                    <input
                      type="number"
                      min={yearRange[0]}
                      max={2025}
                      value={yearRange[1]}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) onYearRangeChange([yearRange[0], Math.max(v, yearRange[0])]);
                      }}
                      className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-sm tabular-nums text-zinc-800 outline-none focus:border-[#002abf]/40 focus:ring-1 focus:ring-[#002abf]/20"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={1990}
                  max={2025}
                  value={yearRange[1]}
                  onChange={(e) => onYearRangeChange([yearRange[0], parseInt(e.target.value, 10)])}
                  className="w-full accent-[#002abf]"
                />
              </div>
            </FilterSection>
          </div>
        )}
      </div>

      {/* ── Mobile filter bar ────────────────────────────────────────────── */}
      <div className="absolute left-3 top-[68px] z-20 flex gap-1.5 md:hidden">
        {MAP_PIN_TYPES.map((type) => {
          const active = filters.has(type);
          return (
            <button
              key={type}
              onClick={() => onToggleFilter(type)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                active
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-900/10"
                  : "bg-white/60 text-zinc-400 ring-1 ring-zinc-200/60"
              }`}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: COLORS[type], opacity: active ? 1 : 0.3 }}
              />
              {LABELS[type]}
            </button>
          );
        })}
        <span className="mx-0.5 w-px self-stretch bg-zinc-200/60" />
        <button
          onClick={onToggleNearYou}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all ${
            nearYouActive
              ? "bg-[#002abf] text-white shadow-sm"
              : "bg-white/60 text-zinc-400 ring-1 ring-zinc-200/60"
          }`}
        >
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="8" cy="8" r="3" />
            <circle cx="8" cy="8" r="6.5" />
          </svg>
          {nearYouActive ? `Near (${nearYouCount})` : "Near You"}
        </button>
      </div>
    </>
  );
}
