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

// ─── Sort helper ──────────────────────────────────────────────────────────────

function sortItems(
  items: ProfileDirectoryItem[],
  sort: SortOption
): ProfileDirectoryItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "most_listings":
        return b.listings_count - a.listings_count;
      case "most_connected":
        return b.connections_count - a.connections_count;
    }
  });
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
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

  const copy = {
    label: "ARCHTIVY DIRECTORY",
    title: isDesigners ? "Designers" : "Brands",
    description: isDesigners
      ? "A curated network of designers, studios, and creative professionals."
      : "A curated network of brands, manufacturers, and product makers.",
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

  const controlClass =
    "w-full rounded-[6px] border border-[#E8E8E8] bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-[#002abf] focus:ring-1 focus:ring-[#002abf]/20";

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <section className="border-b border-[#EAEAEA] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

            {/* Left: label + title + description + stats */}
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {copy.label}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {copy.title}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                {copy.description}
              </p>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-500">
                <span>
                  <span className="font-semibold text-zinc-900">{fmt(items.length)}</span>{" "}
                  {copy.profileLabel}
                </span>
                {totalListings > 0 && (
                  <span>
                    <span className="font-semibold text-zinc-900">{fmt(totalListings)}</span>{" "}
                    listings
                  </span>
                )}
                {totalConnections > 0 && (
                  <span>
                    <span className="font-semibold text-zinc-900">{fmt(totalConnections)}</span>{" "}
                    connections
                  </span>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className={controlClass}
                aria-label="Sort by"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="most_listings">Sort: Most Listings</option>
                <option value="most_connected">Sort: Most Connected</option>
              </select>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isDesigners ? "Search designer or studio…" : "Search brand or maker…"}
                className={controlClass}
                aria-label="Search"
              />
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                placeholder="Filter by city…"
                className={controlClass}
                aria-label="Filter by city"
              />
              {(search || cityFilter) && (
                <p className="text-xs text-zinc-400">
                  {filtered.length} of {items.length} shown ·{" "}
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setCityFilter(""); }}
                    className="text-[#002abf] hover:underline"
                  >
                    Clear
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[#ECECEC] bg-white px-4 py-16 text-center">
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
              <li key={item.id}>
                <ProfileDirectoryCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
