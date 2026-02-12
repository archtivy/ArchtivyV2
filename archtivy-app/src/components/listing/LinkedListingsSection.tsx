import type { ReactNode } from "react";
import type { ListingSummary } from "@/lib/types/listings";
import { ProjectCard } from "./ProjectCard";
import { ProductCard } from "./ProductCard";

interface LinkedListingsSectionProps {
  title: string;
  items: ListingSummary[];
  baseHref: string;
  emptyMessage: string;
  /** Optional CTA when empty or always (e.g. "Link product" selector) */
  action?: ReactNode;
  /** First image URL per listing id (for card thumbnails) */
  imageMap?: Record<string, string>;
  /** Type of listings in this section so correct card is rendered */
  listingType: "project" | "product";
}

export function LinkedListingsSection({
  title,
  items,
  emptyMessage,
  action,
  imageMap = {},
  listingType,
}: LinkedListingsSectionProps) {
  return (
    <section className="space-y-3" aria-labelledby="linked-section-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="linked-section-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h2>
        {action}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <ul
          className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${listingType === "project" ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
        >
          {items.map((item) =>
            listingType === "project" ? (
              <li key={item.id}>
                <ProjectCard
                  listing={item}
                  imageUrl={imageMap[item.id]}
                />
              </li>
            ) : (
              <li key={item.id}>
                <ProductCard
                  listing={item}
                  imageUrl={imageMap[item.id]}
                />
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}
