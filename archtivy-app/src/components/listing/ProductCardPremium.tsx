"use client";

import Link from "next/link";
import Image from "next/image";
import type { ProductCanonical } from "@/lib/canonical-models";
import { getListingUrl } from "@/lib/canonical";
import { getOwnerProfileHref } from "@/lib/cardUtils";

export interface ProductCardPremiumProps {
  product: ProductCanonical;
}

export function ProductCardPremium({ product }: ProductCardPremiumProps) {
  const href = getListingUrl({ id: product.id, type: "product" });
  const title = product.title?.trim() || "Product";
  const connectionCount = product.connectionCount ?? 0;
  const owner = product.owner;
  const ownerLabel = owner?.displayName?.trim() || null;
  const ownerHref = ownerLabel ? getOwnerProfileHref(owner) : null;
  const showOwner = Boolean(ownerLabel);

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded border bg-white transition hover:shadow-md dark:bg-zinc-950"
      style={{ borderColor: "#f1f1f1" }}
    >
      <Link href={href} className="block shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-inset">
        <div className="aspect-[3/2] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
          {product.cover ? (
            <Image
              src={product.cover}
              alt={title}
              width={400}
              height={267}
              className="h-full w-full object-cover transition duration-200 hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500" aria-hidden>
              <span className="text-sm">—</span>
            </div>
          )}
        </div>
      </Link>
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <Link
          href={href}
          className="font-serif text-[18px] font-medium leading-tight tracking-tight text-zinc-900 hover:text-[#002abf] dark:text-zinc-100 dark:hover:text-[#5b7cff] sm:text-xl line-clamp-2 min-h-[2.5rem] focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2"
        >
          {title}
        </Link>
        {showOwner && (
          <p className="mt-1.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
            by{" "}
            {ownerHref ? (
              <Link
                href={ownerHref}
                className="text-zinc-500 no-underline transition hover:text-[#002abf] dark:text-zinc-400 dark:hover:text-[#5b7cff] focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                {ownerLabel}
              </Link>
            ) : (
              <span>{ownerLabel}</span>
            )}
          </p>
        )}
        <p className="mt-auto pt-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-500">
          {connectionCount} {connectionCount === 1 ? "connection" : "connections"}
        </p>
      </div>
    </div>
  );
}
