"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilterSection as Section,
  FilterCheckList as CheckList,
} from "@/components/directory/FilterPrimitives";
import type { InspirationFacets } from "@/lib/db/inspirations";

/**
 * Inspiration filter rail — URL-STATE DRIVEN (spec §9).
 *
 * This is the deliberate divergence from /projects, /products, /designers and
 * /brands, which all hold filter state in React. Documented exception per
 * §9.5: collection and filtered views here have an SEO and shareability mandate
 * those four pages never had, so the URL has to be the source of truth.
 *
 * Every change is a router.replace with scroll:false, so filtering never jumps
 * the page and the back button walks filter history.
 *
 * SECTIONS PRESENT: Style, Space, Architectural Elements, Colour, Category,
 * plus the "with products" toggle. Mood and Awards are absent — no taxonomy,
 * no entity, nothing to render (§9.6).
 */
export function InspirationFilters({ facets }: { facets: InspirationFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const commit = useCallback(
    (next: URLSearchParams) => {
      next.delete("page"); // any filter change returns to page 1
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname]
  );

  const toggle = useCallback(
    (key: string) => (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const current = next.getAll(key);
      next.delete(key);
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      for (const v of updated) next.append(key, v);
      commit(next);
    },
    [searchParams, commit]
  );

  const selected = (key: string) => searchParams.getAll(key);

  const withProducts = searchParams.get("hasProducts") === "1";
  const toggleWithProducts = () => {
    const next = new URLSearchParams(searchParams.toString());
    if (withProducts) next.delete("hasProducts");
    else next.set("hasProducts", "1");
    commit(next);
  };

  const activeCount =
    ["style", "space", "element", "color", "category"].reduce(
      (n, k) => n + searchParams.getAll(k).length,
      0
    ) + (withProducts ? 1 : 0);

  const reset = () => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    const tab = searchParams.get("tab");
    if (q) next.set("q", q);
    if (tab) next.set("tab", tab);
    commit(next);
  };

  return (
    <div
      className={`rounded-xl border border-hairline bg-cream p-5 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-body text-[14px] text-ink">Discover by</h2>
        <button
          type="button"
          onClick={reset}
          disabled={activeCount === 0}
          className="font-body text-[12px] text-muted underline underline-offset-4 transition-colors hover:text-ink disabled:no-underline disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {facets.styles.length > 0 && (
        <Section label="Styles" count={facets.styles.length} defaultOpen>
          <CheckList values={facets.styles} selected={selected("style")} onToggle={toggle("style")} />
        </Section>
      )}

      {facets.spaces.length > 0 && (
        <Section label="Spaces" count={facets.spaces.length} defaultOpen>
          <CheckList values={facets.spaces} selected={selected("space")} onToggle={toggle("space")} />
        </Section>
      )}

      {facets.elements.length > 0 && (
        <Section label="Architectural Elements" count={facets.elements.length}>
          <CheckList
            values={facets.elements}
            selected={selected("element")}
            onToggle={toggle("element")}
          />
        </Section>
      )}

      {facets.colors.length > 0 && (
        <Section label="Colors" count={facets.colors.length}>
          <CheckList values={facets.colors} selected={selected("color")} onToggle={toggle("color")} />
        </Section>
      )}

      {facets.categories.length > 0 && (
        <Section label="Category" count={facets.categories.length}>
          <CheckList
            values={facets.categories}
            selected={selected("category")}
            onToggle={toggle("category")}
            searchPlaceholder={facets.categories.length > 8 ? "Search categories" : undefined}
          />
        </Section>
      )}

      {facets.withProductsCount > 0 && (
        <Section label="Products" defaultOpen>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={withProducts}
              onChange={toggleWithProducts}
              className="h-3.5 w-3.5 shrink-0 accent-ink"
            />
            <span className="min-w-0 flex-1 font-body text-[13px] text-ink">
              With identified products
            </span>
            <span className="font-body text-[12px] text-muted">{facets.withProductsCount}</span>
          </label>
        </Section>
      )}
    </div>
  );
}
