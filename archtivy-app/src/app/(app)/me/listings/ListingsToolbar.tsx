"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/**
 * Tabs, search, status and sort for /me/listings.
 *
 * ── EVERY CONTROL WRITES THE URL ────────────────────────────────────────────
 * The page filters server-side from searchParams, so this component's only job
 * is to keep the query string correct. That is what makes the first paint
 * already-filtered and Back/Forward restore an exact view — and it means the
 * toolbar holds no copy of the list it is filtering.
 *
 * Search is debounced and REPLACES rather than pushes, so typing eight
 * characters leaves one history entry instead of eight.
 */
export function ListingsToolbar({
  tab,
  status,
  q,
  sort,
  counts,
}: {
  tab: string;
  status: string;
  q: string;
  sort: string;
  counts: { all: number; projects: number; products: number; drafts: number };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(q);

  // Keep the field in step when the URL changes from elsewhere (Back, or the
  // Clear button), without fighting the user mid-keystroke.
  useEffect(() => setTerm(q), [q]);

  useEffect(() => {
    if (term === q) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (term.trim()) params.set("q", term.trim());
      else params.delete("q");
      router.replace(`/me/listings${params.toString() ? `?${params}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [term, q, router, searchParams]);

  const href = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all" || (k === "sort" && v === "recent")) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return `/me/listings${s ? `?${s}` : ""}`;
  };

  // Only offer a tab that has something behind it. "All" always shows so the
  // filter can be cleared even when a tab empties.
  const tabs = [
    { key: "all", label: "All", count: counts.all, show: true },
    { key: "projects", label: "Projects", count: counts.projects, show: counts.projects > 0 },
    { key: "products", label: "Products", count: counts.products, show: counts.products > 0 },
    { key: "drafts", label: "Drafts", count: counts.drafts, show: counts.drafts > 0 },
  ].filter((t) => t.show);

  return (
    <div className="mt-7">
      <nav className="flex gap-5 border-b border-hairline" aria-label="Listings tabs">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={href({ tab: t.key })}
            aria-current={tab === t.key ? "page" : undefined}
            className={[
              "-mb-px border-b-2 pb-2.5 font-body text-[14px] transition-colors",
              tab === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.label} ({t.count})
          </Link>
        ))}
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-0 flex-1 sm:max-w-[320px]">
          <Search
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search your listings…"
            aria-label="Search your listings"
            className="h-9 w-full rounded-lg border border-hairline bg-white pl-9 pr-8 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-ink"
            >
              <X strokeWidth={1.5} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status stays a second axis rather than becoming a fifth tab: it
            composes with Projects/Products, which a tab could not do. */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by status">
          {[
            ["all", "All"],
            ["published", "Published"],
            ["drafts", "Drafts"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={href({ status: key })}
              aria-current={status === key ? "true" : undefined}
              className={[
                "rounded-lg border px-3 py-1.5 font-body text-[12px] transition-colors",
                status === key
                  ? "border-ink bg-ink text-cream"
                  : "border-hairline text-muted hover:border-ink/25 hover:text-ink",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2">
          <span className="font-body text-[12px] text-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => router.push(href({ sort: e.target.value }), { scroll: false })}
            className="h-9 rounded-lg border border-hairline bg-white px-2.5 font-body text-[13px] text-ink focus:border-ink/30 focus:outline-none"
          >
            <option value="recent">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="views">Most viewed</option>
            <option value="saves">Most saved</option>
          </select>
        </label>
      </div>
    </div>
  );
}
