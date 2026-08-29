"use client";

import { Search, X } from "lucide-react";

/**
 * The dominant search field in the control bar.
 *
 * ── IT NO LONGER LEAVES THE PAGE ────────────────────────────────────────────
 * This used to submit to /explore/projects?q=, because that was where every
 * project search in the app went and this bar simply copied HeroSearch. The
 * result was that searching from the new directory threw you into the old
 * Explore results UI — two different project discovery designs, one search
 * box away from each other.
 *
 * `q` is now a filter like any other in lib/projects/directoryParams, so the
 * query composes with the category, the country, the sort and everything else
 * on whatever route you are already on: /projects?q=house works, and so does
 * /projects/residential?q=house without bouncing out of the category.
 *
 * Controlled by the URL, which is what keeps the term in the box after a
 * reload and restores it correctly on browser back.
 *
 * The camera button in the reference is not here: there is no image-search
 * endpoint in this codebase, so it could only open a picker leading nowhere.
 */
export function ProjectsSearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (q: string) => void;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className="relative min-w-0 flex-1"
    >
      <Search
        strokeWidth={1.5}
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search projects, locations, studios, products, materials…"
        aria-label="Search projects"
        className="w-full rounded-full border border-hairline bg-cream py-3 pl-11 pr-11 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-stone/50 hover:text-ink"
        >
          <X strokeWidth={1.5} className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
