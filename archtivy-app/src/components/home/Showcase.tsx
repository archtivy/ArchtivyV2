"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowDown } from "lucide-react";
import Link from "next/link";
import {
  ListingCardShared,
  type ListingCardModel,
} from "@/components/listing/ListingCardShared";

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
 *
 * ── IT TAKES CARD MODELS NOW, NOT A FLATTENED SHAPE ─────────────────────────
 * This used to define its own `ShowcaseItem` — title, subtitle, meta, location,
 * imageUrl — and build a ListingCardModel from it inline. That intermediate
 * shape had no slot for the category href, the owner logo, the year, the credit
 * count or the relationship badge, so the fields were not "lost" at render
 * time: they were dropped at the page, one layer earlier, and could not be
 * recovered here however the card was styled.
 *
 * The visible result was a homepage project card carrying only a location, a
 * title and "by X" — no taxonomy line, no studio logo, no "Used N products from
 * M brands" — while the SAME ListingCardShared on /projects drew all of it. One
 * component looking like two cards, which is exactly the defect the shared card
 * exists to prevent.
 *
 * The page now maps with projectToCardModel / productToCardModel — the same
 * mappers every other canonical surface uses — and passes the finished model
 * straight through. This component no longer knows what a project or a product
 * is; it lays out cards and filters them.
 */

export interface ShowcaseItem {
  /** The FULL canonical model, built by the shared mapper. Never a subset. */
  model: ListingCardModel;
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
  /** Prints PROJECT / PRODUCT on each card. See ListingCardShared. */
  typeBadge?: boolean;
  /**
   * False caps the section at `pageSize` with no "Load more" — the section
   * shows exactly that many and the "View all" link in the header is the way
   * to the rest.
   */
  loadMore?: boolean;
  /**
   * Cards per row at the widest desktop step. The products showcase runs
   * denser than the projects one by design.
   *
   * Only 4 and 5 are offered because those are the two counts the container
   * can hold at a readable card width — see GRIDS below, where every step is
   * derived from the real inner width rather than picked.
   */
  maxColumns?: 4 | 5;
}

/*
 * ── COLUMN COUNTS, DERIVED FROM THE CONTAINER ───────────────────────────────
 * The homepage content column is `max-w-content` (1440px) with px-4 / md:px-12
 * / lg:px-24, so the INNER width the grid actually gets is:
 *
 *      390 ->  358      1024 ->  832      1400 -> 1208
 *      768 ->  672      1280 -> 1088      1440+ -> 1248 (capped)
 *
 * With gap-x-6 (24px) that gives, per card:
 *
 *   cols   768    1024    1280    1400    1440+
 *     2    324     404       -       -        -
 *     3    208     261     347       -        -
 *     4      -       -     254     284      294
 *     5      -       -     198     222      230
 *
 * Five columns was introduced at 1400 so a card never fell below ~222px. The
 * homepage products showcase now ships exactly five items and must read as ONE
 * row on desktop, so the 5-column step moves to xl (1280), where a card is
 * 198px — measured, not guessed. That is the narrowest step in the table and
 * it is a deliberate trade for the single row; between 1280 and 1400 a product
 * tile is tighter than it was. The card itself is unchanged.
 */
const GRIDS: Record<4 | 5, string> = {
  4: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
};

/** Mirrors GRIDS step for step, so the browser never fetches the wrong size. */
const SIZES: Record<4 | 5, string> = {
  4: "(max-width: 767px) 45vw, (max-width: 1279px) 28vw, (max-width: 1439px) 20vw, 294px",
  5: "(max-width: 767px) 45vw, (max-width: 1279px) 28vw, (max-width: 1439px) 17vw, 230px",
};

export function Showcase({
  title,
  viewAllHref,
  viewAllLabel,
  items,
  filters,
  ratio = "4/3",
  pageSize = 8,
  maxColumns = 4,
  typeBadge = false,
  loadMore = true,
}: ShowcaseProps) {
  const [active, setActive] = useState<string | null>(null);
  const [visible, setVisible] = useState(pageSize);

  const filtered = useMemo(
    () => (active === null ? items : items.filter((i) => i.group === active)),
    [items, active]
  );

  const shown = filtered.slice(0, visible);
  const hasMore = loadMore && filtered.length > visible;

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
        <div className={`grid gap-x-6 gap-y-8 ${GRIDS[maxColumns]}`}>
          {shown.map((it) => (
            /* The model is passed straight through, untouched. Nothing is
               rebuilt, defaulted or dropped here — whatever the canonical
               mapper produced is what the card receives. */
            <ListingCardShared
              key={it.model.id}
              model={it.model}
              ratio={ratio}
              sizes={SIZES[maxColumns]}
              typeBadge={typeBadge}
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
