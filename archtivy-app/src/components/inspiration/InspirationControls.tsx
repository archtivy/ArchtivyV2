"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { INSPIRATION_TABS, type InspirationTab } from "@/lib/db/inspirations";

const TAB_LABELS: Record<InspirationTab, string> = {
  all: "All Inspirations",
  projects: "Projects",
  products: "Products",
  materials: "Materials",
};

/**
 * Tabs, search box and active-filter chips — all writing to the URL.
 *
 * Interiors and Exteriors are absent from INSPIRATION_TABS on purpose:
 * listing_images.shot_type is NULL on all 1,159 rows, so those tabs would be
 * permanently empty. They return when the classification backfill runs (§9.6).
 */
export function InspirationControls({
  total,
  relaxed,
}: {
  total: number;
  relaxed: { filter: string; value: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState(searchParams.get("q") ?? "");

  const activeTab = (searchParams.get("tab") as InspirationTab | null) ?? "all";

  const commit = useCallback(
    (next: URLSearchParams) => {
      next.delete("page");
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname]
  );

  const setTab = (tab: InspirationTab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    commit(next);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    const q = draft.trim();
    if (q) next.set("q", q);
    else next.delete("q");
    commit(next);
  };

  const chips: { key: string; value: string; label: string }[] = [];
  for (const key of ["style", "space", "element", "color", "category"]) {
    for (const value of searchParams.getAll(key)) chips.push({ key, value, label: value });
  }
  if (searchParams.get("hasProducts") === "1") {
    chips.push({ key: "hasProducts", value: "1", label: "With identified products" });
  }
  const q = searchParams.get("q");
  if (q) chips.push({ key: "q", value: q, label: `“${q}”` });

  const removeChip = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (key === "hasProducts" || key === "q") {
      next.delete(key);
      if (key === "q") setDraft("");
    } else {
      const remaining = next.getAll(key).filter((v) => v !== value);
      next.delete(key);
      for (const v of remaining) next.append(key, v);
    }
    commit(next);
  };

  return (
    <div>
      <form onSubmit={submitSearch} className="relative mb-6 w-full max-w-[560px]">
        <label htmlFor="inspiration-search" className="sr-only">
          Search inspirations
        </label>
        <Search
          strokeWidth={1.5}
          className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id="inspiration-search"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search anything…"
          className="h-[52px] w-full rounded-full border border-hairline bg-cream pl-12 pr-5 font-body text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-3">
        <ul className="flex min-w-0 gap-1 overflow-x-auto lg:flex-wrap lg:overflow-visible">
          {INSPIRATION_TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <li key={tab} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setTab(tab)}
                  aria-pressed={isActive}
                  className={[
                    "whitespace-nowrap rounded-full px-3.5 py-1.5 font-body text-[13px] transition-colors",
                    isActive ? "bg-ink text-cream" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {TAB_LABELS[tab]}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="shrink-0 font-body text-[13px] text-muted">
          {total} {total === 1 ? "result" : "results"}
        </p>
      </div>

      {/* Search Bible §Zero-Result: say what was relaxed, never silently widen. */}
      {relaxed && (
        <p className="mb-5 rounded-lg bg-stone/50 px-4 py-3 font-body text-[13px] text-ink">
          Nothing matched every filter, so <strong>{relaxed.value}</strong> was relaxed to show
          these results.
        </p>
      )}

      {chips.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={`${c.key}-${c.value}`}
              type="button"
              onClick={() => removeChip(c.key, c.value)}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone px-3 py-1 font-body text-[12px] text-ink"
            >
              {c.label}
              <X strokeWidth={2} className="h-3 w-3" aria-hidden />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <Link
            href={pathname}
            scroll={false}
            className="font-body text-[12px] text-muted underline underline-offset-4 hover:text-ink"
          >
            Clear all
          </Link>
        </div>
      )}
    </div>
  );
}
