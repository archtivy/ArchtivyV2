"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FilterTab = "all" | "projects" | "products";
type SortOption = "recent" | "name";

export function BoardDetailFilters({
  currentFilter,
  currentSort,
  currentSearch,
  basePath,
}: {
  currentFilter: FilterTab;
  currentSort: SortOption;
  currentSearch: string;
  folderId: string;
  basePath: string;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState(currentSearch);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setSearch(currentSearch);
  }, [currentSearch]);

  const buildUrl = (opts: { filter?: FilterTab; sort?: SortOption; q?: string }) => {
    const params = new URLSearchParams();
    const filter = opts.filter ?? currentFilter;
    const sort = opts.sort ?? currentSort;
    const q = opts.q !== undefined ? opts.q : currentSearch;
    if (filter !== "all") params.set("filter", filter);
    if (sort !== "recent") params.set("sort", sort);
    if (q.trim()) params.set("q", q.trim());
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    const params = new URLSearchParams();
    if (currentFilter !== "all") params.set("filter", currentFilter);
    if (currentSort !== "recent") params.set("sort", currentSort);
    if (q) params.set("q", q);
    const query = params.toString();
    setPending(true);
    router.push(query ? `${basePath}?${query}` : basePath);
    setPending(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-muted">
          Filter
        </span>
        <nav className="flex gap-1" aria-label="Filter by type">
          <FilterLink href={buildUrl({ filter: "all" })} active={currentFilter === "all"}>
            All
          </FilterLink>
          <FilterLink href={buildUrl({ filter: "projects" })} active={currentFilter === "projects"}>
            Projects
          </FilterLink>
          <FilterLink href={buildUrl({ filter: "products" })} active={currentFilter === "products"}>
            Products
          </FilterLink>
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Sort
          </span>
          <nav className="flex gap-1" aria-label="Sort order">
            <FilterLink href={buildUrl({ sort: "recent" })} active={currentSort === "recent"}>
              Recently saved
            </FilterLink>
            <FilterLink href={buildUrl({ sort: "name" })} active={currentSort === "name"}>
              Name A–Z
            </FilterLink>
          </nav>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <label htmlFor="board-search" className="sr-only">
            Search within board
          </label>
          <input
            id="board-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in board…"
            className="rounded border border-hairline bg-cream px-3 py-1.5 text-sm"
            style={{ borderRadius: "4px" }}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-ink px-2 py-1.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ink"
            style={{ borderRadius: "4px" }}
          >
            Search
          </button>
        </form>
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded px-2 py-1 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ink ${
        active
          ? "bg-ink text-cream"
          : "text-muted hover:bg-stone/60 hover:text-ink"
      }`}
      style={{ borderRadius: "4px" }}
    >
      {children}
    </Link>
  );
}
