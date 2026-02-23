"use client";

import Link from "next/link";
import Image from "next/image";

export interface RelatedSectionItem {
  id: string;
  slug?: string | null;
  title: string;
  thumbnail?: string | null;
  location?: string | null;
  /** For ProductCard: owner display name */
  postedBy?: string | null;
}

export interface RelatedSectionProps {
  title: string;
  items: RelatedSectionItem[];
  totalCount?: number;
  viewAllHref?: string | null;
  variant: "product" | "project";
  mobileLayout?: "scroll" | "featured";
  desktopShown?: number;
}

const DESKTOP_SHOWN = 4;
const CARD_ASPECT = "aspect-[3/2]";

export function RelatedSection({
  title,
  items,
  totalCount,
  viewAllHref,
  variant,
  mobileLayout = "scroll",
  desktopShown = DESKTOP_SHOWN,
}: RelatedSectionProps) {
  if (items.length === 0) return null;

  const baseHref = variant === "project" ? "/projects" : "/products";
  const shown = Math.min(desktopShown, items.length, 4);
  const total = totalCount ?? items.length;
  const moreCount = Math.max(total - shown, 0);

  const renderInlineCard = (item: RelatedSectionItem) => {
    const href = `${baseHref}/${item.slug ?? item.id}`;
    return (
      <Link
        key={item.id}
        href={href}
        className="group flex flex-col focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        style={{ borderRadius: 4 }}
      >
        <div
          className={`relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${CARD_ASPECT}`}
          style={{ borderRadius: 4 }}
        >
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt=""
              fill
              className="object-cover transition-opacity group-hover:opacity-95"
              sizes="(max-width: 1023px) 78vw, 25vw"
              unoptimized={String(item.thumbnail).startsWith("http")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">
              —
            </div>
          )}
        </div>
        <span className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#002abf] dark:group-hover:text-[#002abf]">
          {item.title}
        </span>
        {variant === "project" && item.location && (
          <span className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            {item.location}
          </span>
        )}
      </Link>
    );
  };

  const headerRight = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {viewAllHref?.trim() && (
        <Link
          href={viewAllHref}
          className="text-sm font-medium text-[#002abf] hover:underline dark:text-[#5b7cff]"
        >
          View all
        </Link>
      )}
      {moreCount > 0 && (
        <span
          className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-[#002abf] dark:border-zinc-700 dark:text-[#5b7cff]"
          style={{ borderRadius: 4 }}
        >
          +{moreCount}
        </span>
      )}
    </div>
  );

  const displayItems = items.slice(0, Math.max(shown, 4));
  const hasHeaderRight = (viewAllHref?.trim() && true) || moreCount > 0;

  return (
    <section
      className="border-t border-zinc-200 pt-8 pb-10 dark:border-zinc-800"
      aria-labelledby={`related-${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          id={`related-${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
          className="font-serif text-xl font-normal text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h2>
        {hasHeaderRight && headerRight}
      </div>

      {/* Desktop: grid 4 columns */}
      <div className="hidden grid-cols-4 gap-6 lg:grid">
        {displayItems.map(renderInlineCard)}
      </div>

      {/* Mobile: featured (1 item) or horizontal scroll */}
      <div className="lg:hidden">
        {mobileLayout === "featured" && items.length === 1 ? (
          <div className="w-full max-w-md">{renderInlineCard(items[0])}</div>
        ) : (
          <div
            className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-1 md:-mx-6 md:px-6"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <div className="flex gap-4" style={{ minWidth: "min-content" }}>
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="w-[78vw] shrink-0 md:max-w-[320px]"
                  style={{ scrollSnapAlign: "start" }}
                >
                  {renderInlineCard(item)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
