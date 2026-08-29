"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * The dominant search field in the control bar.
 *
 * ── EXISTING BEHAVIOUR, NOT A NEW ONE ───────────────────────────────────────
 * Submitting goes to /explore/projects?q=, which is exactly where HeroSearch
 * sends a query and where this page's own popular-search chips already point.
 * That is the project search this application has; giving the directory a
 * second, page-local search would mean two searches with different results
 * under the same word. Empty submit goes to /explore/projects, matching
 * HeroSearch again.
 *
 * The camera button in the reference is not here: there is no image-search
 * endpoint in this codebase, so it could only open a file picker that leads
 * nowhere.
 */
export function ProjectsSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/explore/projects?q=${encodeURIComponent(v)}` : "/explore/projects");
      }}
      className="relative min-w-0 flex-1"
    >
      <Search
        strokeWidth={1.5}
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search projects, locations, studios, products, materials…"
        aria-label="Search projects"
        className="w-full rounded-full border border-hairline bg-cream py-3 pl-11 pr-4 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none"
      />
    </form>
  );
}
