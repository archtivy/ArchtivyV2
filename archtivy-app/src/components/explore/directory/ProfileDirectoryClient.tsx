"use client";

import { useMemo, useState } from "react";
import type { ProfileDirectoryItem } from "@/lib/db/profileDirectory";
import { ProfileDirectoryCard } from "./ProfileDirectoryCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = "newest" | "oldest" | "most_listings" | "most_connected";

export interface ProfileDirectoryClientProps {
  variant: "designers" | "brands";
  items: ProfileDirectoryItem[];
}

// ─── Hero metric pill ─────────────────────────────────────────────────────────

function MetricPill({ value, label }: { value: number; label: string }) {
  const formatted =
    value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(value);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-lg font-medium text-zinc-900">{formatted}</span>
      <span className="text-sm text-zinc-500">{label}</span>
    </span>
  );
}

// ─── Filter/sort bar ──────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#002abf] focus:ring-1 focus:ring-[#002abf]/20";

const selectClass =
  "w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#002abf] focus:ring-1 focus:ring-[#002abf]/20 cursor-pointer";

function FilterBar({
  sort,
  search,
  cityFilter,
  onSort,
  onSearch,
  onCity,
  resultCount,
  totalCount,
}: {
  sort: SortOption;
  search: string;
  cityFilter: string;
  onSort: (v: SortOption) => void;
  onSearch: (v: string) => void;
  onCity: (v: string) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Sort by
        </label>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortOption)}
          className={selectClass}
          style={{ borderRadius: 4 }}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="most_listings">Most Listings</option>
          <option value="most_connected">Most Connected</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          Search
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Name, studio, brand…"
          className={inputClass}
          style={{ borderRadius: 4 }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          City
        </label>
        <input
          type="text"
          value={cityFilter}
          onChange={(e) => onCity(e.target.value)}
          placeholder="e.g. London, Tokyo…"
          className={inputClass}
          style={{ borderRadius: 4 }}
        />
      </div>

      {(search || cityFilter) && (
        <p className="text-xs text-zinc-400">
          {resultCount} of {totalCount} shown
        </p>
      )}
    </div>
  );
}

// ─── Sort helper ──────────────────────────────────────────────────────────────

function sortItems(
  items: ProfileDirectoryItem[],
  sort: SortOption
): ProfileDirectoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "most_listings":
        return b.listings_count - a.listings_count;
      case "most_connected":
        return b.connections_count - a.connections_count;
    }
  });
}

// ─── Main client component ────────────────────────────────────────────────────

export function ProfileDirectoryClient({
  variant,
  items,
}: ProfileDirectoryClientProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const isDesigners = variant === "designers";

  const hero = {
    eyebrow: "Archtivy Directory",
    title: isDesigners ? "Designers" : "Brands",
    subtitle: isDesigners
      ? "A growing network of people, projects, and products — mapped in real places."
      : "A growing network of brands, products, and projects — mapped in real places.",
    profileLabel: isDesigners ? "designers" : "brands",
  };

  const totalListings = useMemo(
    () => items.reduce((s, p) => s + p.listings_count, 0),
    [items]
  );
  const totalConnections = useMemo(
    () => items.reduce((s, p) => s + p.connections_count, 0),
    [items]
  );

  const filtered = useMemo(() => {
    let list = sortItems(items, sort);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.display_name ?? "").toLowerCase().includes(q) ||
          (p.username ?? "").toLowerCase().includes(q)
      );
    }

    if (cityFilter.trim()) {
      const c = cityFilter.trim().toLowerCase();
      list = list.filter((p) =>
        (p.location_city ?? "").toLowerCase().includes(c)
      );
    }

    return list;
  }, [items, sort, search, cityFilter]);

  return (
    <div style={{ backgroundColor: "#fafafa" }} className="min-h-screen">
      {/* ── Hero ── */}
      <section className="border-b border-[#eeeeee] bg-white">
        <div className="mx-auto max-w-[1040px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: text + metrics */}
            <div className="lg:max-w-[52ch]">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                {hero.eyebrow}
              </p>
              <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-zinc-900 sm:text-5xl">
                {hero.title}
              </h1>
              <p className="mt-4 text-base text-zinc-500 sm:text-lg">
                {hero.subtitle}
              </p>

              {/* Metrics */}
              <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#eeeeee] pt-5">
                <MetricPill value={items.length} label={hero.profileLabel} />
                {totalListings > 0 && (
                  <MetricPill value={totalListings} label="listings" />
                )}
                {totalConnections > 0 && (
                  <MetricPill value={totalConnections} label="connections" />
                )}
              </div>
            </div>

            {/* Right: filter bar */}
            <div className="w-full lg:w-64 shrink-0">
              <FilterBar
                sort={sort}
                search={search}
                cityFilter={cityFilter}
                onSort={setSort}
                onSearch={setSearch}
                onCity={setCityFilter}
                resultCount={filtered.length}
                totalCount={items.length}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <div className="mx-auto max-w-[1040px] px-4 py-10 sm:px-6">
        {filtered.length === 0 ? (
          <div className="rounded border border-[#eeeeee] bg-white px-4 py-16 text-center" style={{ borderRadius: 4 }}>
            <p className="text-sm text-zinc-500">
              {search || cityFilter
                ? "No results match your search."
                : isDesigners
                ? "No designers yet."
                : "No brands yet."}
            </p>
            {(search || cityFilter) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCityFilter(""); }}
                className="mt-3 text-sm font-medium text-[#002abf] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <ul
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            aria-label={isDesigners ? "Designers directory" : "Brands directory"}
          >
            {filtered.map((item) => (
              <li key={item.id} className="flex">
                <div className="flex w-full">
                  <ProfileDirectoryCard item={item} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {filtered.length > 0 && (search || cityFilter) && (
          <p className="mt-6 text-xs text-zinc-400">
            Showing {filtered.length} of {items.length}{" "}
            {hero.profileLabel}
          </p>
        )}
      </div>
    </div>
  );
}
