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

  const connectionsCount = product.usedInProjectsCount ?? 0;

  return (
    <ProductListingCard
      image={product.cover}
      imageAlt={product.title}
      brandName={product.owner?.displayName ?? null}
      brandHref={brandHref}
      title={product.title}
      href={href}
      connectionsCount={connectionsCount}
    />
  );
}
