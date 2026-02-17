"use client";

import { useState, useTransition } from "react";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { Button } from "@/components/ui/Button";
import { fetchProductsPage } from "@/app/actions/explore";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ProductFilters } from "@/lib/exploreFilters";
import type { ProductSortOption } from "@/lib/exploreFilters";

export interface ExploreProductsContentProps {
  initialData: ProductCanonical[];
  initialTotal: number;
  filters: ProductFilters;
  sort: ProductSortOption;
  children?: React.ReactNode;
}

export function ExploreProductsContent({
  initialData,
  initialTotal,
  filters,
  sort,
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
    <div className="flex flex-col gap-6">
      {children}
      <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Products">
        {products.map((p) => (
          <li key={p.id} className="h-full">
            <ProductCardPremium product={p} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="flex justify-center">
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
  );
}
