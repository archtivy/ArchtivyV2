"use client";

import Link from "next/link";
import { ListingCardShared } from "@/components/listing/ListingCardShared";

export interface MoreInCategoryItem {
  id: string;
  slug: string | null;
  title: string;
  thumbnail?: string | null;
  /** For projects: location text */
  location?: string | null;
}

export interface MoreInCategoryBlockProps {
  /** Type for href and grid layout */
  type: "projects" | "products";
  items: MoreInCategoryItem[];
  /** Optional category label for heading, e.g. "Residential" → "More Residential Projects" */
  categoryLabel?: string | null;
  /** Optional link to the archive page for "View all" */
  viewAllHref?: string | null;
}

const MORE_LIMIT = 8;

/**
 * Compact card grid for "More in this category" on listing detail pages.
 */
export function MoreInCategoryBlock({ type, items, categoryLabel, viewAllHref }: MoreInCategoryBlockProps) {
  const list = items.slice(0, MORE_LIMIT);
  if (list.length === 0) return null;

  const baseHref = type === "projects" ? "/projects" : "/products";
  const aspectClass = type === "projects" ? "aspect-[4/3]" : "aspect-square";
  const typeLabel = type === "projects" ? "Projects" : "Products";
  const heading = categoryLabel
    ? `More ${categoryLabel} ${typeLabel}`
    : `More in this category`;

  return (
    <section
      className="mt-10 border-t border-hairline pt-10"
      aria-labelledby="more-in-category-heading"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2
          id="more-in-category-heading"
          className="font-display text-[24px] leading-[32px] tracking-tight text-ink"
        >
          {heading}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="font-body text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            View all &rarr;
          </Link>
        )}
      </div>
      {/* Was a hand-rolled card in the legacy zinc + dark: palette, with
          #002abf focus rings — a colour that is not the current primary. The
          shared card replaces the markup and the palette together. */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((item) => (
          <ListingCardShared
            key={item.id}
            model={{
              id: item.id,
              type: type === "projects" ? "project" : "product",
              title: item.title,
              href: `${baseHref}/${item.slug ?? item.id}`,
              imageUrl: item.thumbnail ?? null,
              metaLabel: type === "projects" ? item.location ?? null : null,
            }}
            ratio={type === "products" ? "1/1" : "4/3"}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ))}
      </div>
    </section>
  );
}
