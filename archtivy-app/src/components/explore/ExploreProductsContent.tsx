"use client";

import { useState, useTransition } from "react";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { Button } from "@/components/ui/Button";
import { fetchProductsPage } from "@/app/actions/explore";
import { RelatedProfilesStrip } from "@/components/explore/RelatedProfilesStrip";
import type { RelatedProfilesStripItem } from "@/components/explore/RelatedProfilesStrip";
import type { ProductCanonical } from "@/lib/canonical-models";
import type { ProductFilters } from "@/lib/exploreFilters";
import type { ProductSortOption } from "@/lib/exploreFilters";

// Insert strip after the 8th card (index 7) = after 2 rows of 4 on desktop
const STRIP_INSERT_AFTER = 7;

export interface ExploreProductsContentProps {
  initialData: ProductCanonical[];
  initialTotal: number;
  filters: ProductFilters;
  sort: ProductSortOption;
  stripItems?: RelatedProfilesStripItem[];
  children?: React.ReactNode;
}

export function ExploreProductsContent({
  initialData,
  initialTotal,
  filters,
  sort,
  stripItems,
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

  const showStrip = Array.isArray(stripItems) && stripItems.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {children}
      <ul
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        aria-label="Products"
      >
        {products.flatMap((p, i) => {
          const card = (
            <li key={p.id} className="h-full">
              <ProductCardPremium product={p} />
            </li>
          );

          if (i === STRIP_INSERT_AFTER && showStrip) {
            return [
              card,
              <li key="__brands-strip__" className="col-span-full my-1">
                {/* TODO: enrich with real logoUrl when brand profile API is wired */}
                <RelatedProfilesStrip
                  title="Brands & Manufacturers"
                  variant="no-location"
                  items={stripItems}
                />
              </li>,
            ];
          }

          return [card];
        })}
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
