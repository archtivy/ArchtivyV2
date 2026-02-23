"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { debounce } from "@/lib/utils/debounce";
import type { ExploreMapItem, ExploreMapStats, ExploreMode } from "@/lib/explore-map/types";
import { ExploreMapCard } from "./ExploreMapCard";
import { exploreItemKey } from "@/lib/explore-map/types";

const ExploreMapboxMap = dynamic(() => import("./ExploreMapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">
      Loading map…
    </div>
  ),
});

const DEBOUNCE_MS = 300;
const EXPLORE_API = "/api/explore";

export function ExploreMapView() {
  const [mode, setMode] = React.useState<ExploreMode>("all");
  const [q, setQ] = React.useState("");
  const [collab, setCollab] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [items, setItems] = React.useState<ExploreMapItem[]>([]);
  const [stats, setStats] = React.useState<ExploreMapStats>({ projects: 0, designers: 0, brands: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bbox, setBbox] = React.useState<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null>(null);
  const [highlightedKey, setHighlightedKey] = React.useState<string | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

  const fetchExplore = React.useCallback(
    async (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number } | null) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (q.trim()) params.set("q", q.trim());
      if (collab) params.set("collab", "1");
      if (bounds) {
        params.set("minLat", String(bounds.minLat));
        params.set("minLng", String(bounds.minLng));
        params.set("maxLat", String(bounds.maxLat));
        params.set("maxLng", String(bounds.maxLng));
      }
      try {
        const res = await fetch(`${EXPLORE_API}?${params.toString()}`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setItems(data.items ?? []);
        setStats(data.stats ?? { projects: 0, designers: 0, brands: 0 });
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [mode, q, collab]
  );

  const fetchOnBbox = React.useMemo(
    () =>
      debounce((bounds: unknown) => {
        const b = bounds as { minLat: number; minLng: number; maxLat: number; maxLng: number };
        setBbox(b);
        fetchExplore(b);
      }, DEBOUNCE_MS),
    [fetchExplore]
  );

  React.useEffect(() => {
    fetchExplore(bbox);
  }, [mode, q, collab]);

  const handleBoundsChange = React.useCallback(
    (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => {
      fetchOnBbox(bounds);
    },
    [fetchOnBbox]
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="max-w-xs rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            style={{ borderRadius: "4px" }}
            aria-label="Search"
          />
          <nav className="flex gap-1" aria-label="Mode">
            {(["all", "projects", "designers", "brands"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#002abf] ${
                  mode === m
                    ? "bg-[#002abf] text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
                style={{ borderRadius: "4px" }}
              >
                {m === "all" ? "All" : m === "projects" ? "Projects" : m === "designers" ? "Designers" : "Brands"}
              </button>
            ))}
          </nav>
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={collab}
              onChange={(e) => setCollab(e.target.checked)}
              className="rounded border-zinc-300 text-[#002abf] focus:ring-[#002abf]"
            />
            Collaboration
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600"
            style={{ borderRadius: "4px" }}
          >
            Filters
          </button>
        </div>
      </header>

      {/* Filters drawer placeholder */}
      {filtersOpen && (
        <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">More filters coming soon.</p>
        </div>
      )}

      {/* Main: map 45% + cards 55% — explicit height so map container has real height */}
      <div className="flex min-h-0 flex-1" style={{ height: "calc(100vh - 4rem)" }}>
        <div className="h-full w-[45%] shrink-0 border-r border-zinc-200 dark:border-zinc-800">
          <ExploreMapboxMap
            accessToken={mapboxToken}
            items={items}
            highlightedKey={highlightedKey}
            onBoundsChange={handleBoundsChange}
            onMarkerHover={setHighlightedKey}
            className="h-full"
          />
        </div>
        <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          <div className="p-4 space-y-4">
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            {loading && items.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            )}
            {!loading && items.length === 0 && !error && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No results. Pan the map or change filters.</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{stats.projects} projects</span>
              <span>{stats.designers} designers</span>
              <span>{stats.brands} brands</span>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-label="Explore results">
              {items.map((item) => (
                <li key={exploreItemKey(item)}>
                  <ExploreMapCard
                    item={item}
                    highlighted={exploreItemKey(item) === highlightedKey}
                    onHover={setHighlightedKey}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
