"use client";

import { useState, useTransition } from "react";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { Button } from "@/components/ui/Button";
import { fetchProductsPage } from "@/app/actions/explore";
import { ProductFilterSidebar } from "@/components/explore/ProductFilterSidebar";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ProductFilters } from "@/lib/exploreFilters";
import type { ProductSortOption } from "@/lib/exploreFilters";
import type { ExploreFilters } from "@/lib/explore/filters/schema";
import type { ExploreFilterOptions } from "@/lib/explore/filters/options";

export interface ExploreProductsContentProps {
  initialData: ProductCanonical[];
  initialTotal: number;
  filters: ProductFilters;
  sort: ProductSortOption;
  /** Unified explore filters for the sidebar */
  exploreFilters: ExploreFilters;
  /** Filter options for the sidebar dropdowns */
  filterOptions: ExploreFilterOptions;
  children?: React.ReactNode;
}

export function ExploreProductsContent({
  initialData,
  initialTotal,
  filters,
  sort,
  exploreFilters,
  filterOptions,
  children,
}: ExploreProductsContentProps) {
  const [products, setProducts] = useState<ProductCanonical[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();

  const hasMore = products.length < total;
  const loadMore = () => {
    startTransition(async () => {
      const { data: nextData, total: nextTotal } = await fetchProductsPage({
        filters,
        offset: products.length,
        sort,
      });
      setProducts((prev) => [...prev, ...nextData]);
      setTotal(nextTotal);
    });
  };

  return (
    <div className="flex gap-8">
      {/* ── Left: sticky filter sidebar ──────────────────────────────── */}
      <div className="hidden w-[240px] shrink-0 lg:block">
        <div className="sticky top-24">
          <ProductFilterSidebar
            currentFilters={exploreFilters}
            options={filterOptions}
          />
        </div>
      </div>

      {/* ── Right: product grid ──────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {children}

        {/* Result count */}
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {total.toLocaleString()} {total === 1 ? "product" : "products"}
          </p>
        </div>

        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3"
          aria-label="Products"
        >
          {products.map((p) => (
            <li key={p.id} className="h-full">
              <ProductCardPremium product={p} />
            </li>
          ))}
        </ul>

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={loadMore}
              disabled={isPending}
            >
              {isPending ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
