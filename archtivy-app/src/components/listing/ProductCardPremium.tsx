"use client";

import type { ProductCanonical } from "@/lib/canonical-models";
import { getListingUrl } from "@/lib/canonical";
import { getOwnerProfileHref } from "@/lib/cardUtils";
import { ProductListingCard } from "./ProductListingCard";

export interface ProductCardPremiumProps {
  product: ProductCanonical;
}

export function ProductCardPremium({ product }: ProductCardPremiumProps) {
  const href = getListingUrl({ id: product.id, type: "product", slug: product.slug });
  const brandHref = product.owner ? getOwnerProfileHref(product.owner) : null;

  // Prefer taxonomy label > product_category > legacy category
  const category = product.taxonomy_label ?? product.product_category ?? product.category ?? null;
  const categoryHref = category
    ? `/explore/products?category=${encodeURIComponent(category)}`
    : null;

  const connectionsCount = product.usedInProjectsCount ?? product.connectionCount ?? 0;

  return (
    <ProductListingCard
      image={product.cover}
      imageAlt={product.title}
      brandName={product.owner?.displayName ?? null}
      brandHref={brandHref}
      title={product.title}
      href={href}
      category={category}
      categoryHref={categoryHref}
      connectionsCount={connectionsCount}
    />
  );
}
