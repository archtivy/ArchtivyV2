"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import Link from "next/link";
import { ListingCardShared } from "@/components/listing/ListingCardShared";

/**
 * Projects Showcase / Products Showcase (Build Brief §7 and §8).
 *
 * The brief states these are an "identical structural pattern" with swapped
 * content, so this is one component used twice rather than two near-duplicates
 * whose filter behaviour could drift apart (Blueprint §3.6, §10 governance:
 * exhaust existing components before adding new ones).
 *
 * Client-side because the filter pills and the load-more row are interactive.
 * The full item set is passed in already serialised, so filtering costs no
 * network round trip and no layout shift.
 */

export interface ShowcaseItem {
  id: string;
  href: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  /** Root taxonomy segment used by the filter pills. */
  group: string | null;
}

export interface ShowcaseProps {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  items: ShowcaseItem[];
  /** Pill definitions: value matches ShowcaseItem.group; null value = "all". */
  filters: { label: string; value: string | null }[];
  ratio?: "4/3" | "1/1";
  /** How many cards to show before "load more". */
  pageSize?: number;
}

export function Showcase({
  title,
  viewAllHref,
  viewAllLabel,
  items,
  filters,
  ratio = "4/3",
  pageSize = 8,
}: ShowcaseProps) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(pageSize);

  const filtered = useMemo(
    () => (active === null ? items : items.filter((i) => i.group === active)),
    [items, active]
  );

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="font-display text-[24px] leading-[32px] tracking-tight text-ink sm:text-[28px]">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {viewAllLabel}
          <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {/* Filter pills. Horizontally scrollable on narrow viewports rather than
          wrapping into a tall stack. */}
      <ul className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const isActive = f.value === active;
          return (
            <li key={f.label} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActive(f.value);
                  setVisible(pageSize);
                }}
                aria-pressed={isActive}
                className={[
                  "rounded-full px-4 py-2 font-body text-[13px] transition-colors",
                  isActive
                    ? "bg-ink text-cream"
                    : "border border-hairline text-ink hover:bg-stone/50",
                ].join(" ")}
              >
                {f.label}
              </button>
            </li>
          );
        })}
      </ul>

      {shown.length === 0 ? (
        // Never a dead end (Blueprint §17, §22).
        <p className="font-body text-[14px] text-muted">
          Nothing here yet.{" "}
          <Link href={viewAllHref} className="text-ink underline underline-offset-4">
            Browse everything
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          {shown.map((it) => (
            <ListingCardShared
              key={it.id}
              model={{
                id: it.id,
                type: ratio === "1/1" ? "product" : "project",
                title: it.title,
                href: it.href,
                imageUrl: it.imageUrl ?? null,
                categoryLabel: it.meta,
                metaLabel: it.location,
                authorName: it.subtitle,
              }}
              ratio={ratio}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 20vw"
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + pageSize)}
            aria-label={`Show more ${title.toLowerCase()}`}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:bg-stone/50"
          >
            <ArrowDown strokeWidth={1.5} className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
