"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Sparkles, Undo2 } from "lucide-react";
import { SaveToggle } from "@/components/home/SaveToggle";
import type { FeedProduct } from "./useImageDiscovery";

/**
 * The lightbox's right-hand product feed.
 *
 * ── ONE CONTINUOUS FEED, NOT A SET OF CATEGORY SHELVES ──────────────────────
 * Everything renders into a single grid. There is no "Seating" block, no
 * "Lighting" block, no heading between rows and no filter pills. Category is
 * used heavily for RELEVANCE — see TYPE_TO_PATHS in lib/discovery — and never
 * exposed as structure. What the reader gets is a mixed wall of things that
 * suit the room, which is the whole point of the surface.
 *
 * An earlier version split the feed under "Used in this project" and "Fits
 * this space". Those were not category shelves, but they were still shelves,
 * and they broke the continuous scroll the design is built around.
 *
 * ── CONFIRMED AND SUGGESTED STILL CANNOT BE CONFUSED ────────────────────────
 * Losing the headings does not mean losing the distinction. It moves onto the
 * item, which is stronger: confirmed products sort first and each one carries
 * a "Used here" chip drawn from the `exact` array. `similar` items cannot
 * render that chip, because the chip is a property of the branch that renders
 * `exact` and there is no code path where a `similar` item reaches it.
 *
 * "Used here" means a person said so — a product_tags pin at verified/official
 * or a project_product_links row. Nothing an AI produced ever gets it.
 *
 * ── THE INTELLIGENCE IS INVISIBLE ───────────────────────────────────────────
 * The API returns no labels, keywords, confidences or distances, so there is
 * nothing here to leak. No "92% match", no "detected: seating", no style pills.
 */

export type FeedMode = "room" | "object";
export type FeedVariant = "tile" | "detailed";

export interface DiscoveryFeedProps {
  loading: boolean;
  /** Human-confirmed. Never AI output. */
  exact: FeedProduct[];
  /** Visually similar suggestions. */
  similar: FeedProduct[];
  mode: FeedMode;
  /**
   * `tile`     bare images, as the project design draws them — the photograph
   *            is the information and names would turn a wall into a list.
   * `detailed` image, name and brand, as the product design draws them.
   */
  variant: FeedVariant;
  title: string;
  subtitle: string;
  /** Present only in object mode: returns to the whole-room feed. */
  onClearSelection?: () => void;
  onNavigate?: () => void;
  /** Label under the feed when there is more to reveal. */
  moreLabel?: string;
  /**
   * The sparkle marks "Explore this look" as the discovery surface on a
   * project, where the whole column is a suggestion. A product's "Similar
   * products" is a plain relationship and the design draws it plain.
   */
  showSparkle?: boolean;
}

/** Shown before "Explore more" appears. Enough to fill the panel twice over. */
const INITIAL_VISIBLE = 16;

export function DiscoveryFeed({
  loading,
  exact,
  similar,
  mode,
  variant,
  title,
  subtitle,
  onClearSelection,
  onNavigate,
  moreLabel = "Explore more",
  showSparkle = true,
}: DiscoveryFeedProps) {
  const [expanded, setExpanded] = useState(false);

  /*
   * ── THE ONE PLACE THE TWO KINDS MEET ──────────────────────────────────────
   * Confirmed first, then suggestions, in one array — and the `confirmed` flag
   * travels with each item from the array it came out of. Nothing downstream
   * re-derives it, so nothing downstream can get it wrong.
   */
  const items = [
    ...exact.map((p) => ({ product: p, confirmed: true })),
    ...similar.map((p) => ({ product: p, confirmed: false })),
  ];

  const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
  const hasMore = items.length > visible.length;

  return (
    <section className="pb-2" aria-label="Product discovery">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          {showSparkle && (
            <Sparkles strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0 text-white/85" aria-hidden />
          )}
          <h2 className="font-display text-[20px] leading-[26px] tracking-tight text-white">
            {title}
          </h2>
        </div>
        <p className="mt-1.5 font-body text-[13px] leading-[18px] text-white/45">{subtitle}</p>
      </header>

      {mode === "object" && onClearSelection && (
        <button
          type="button"
          onClick={onClearSelection}
          className="mb-4 flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Undo2 strokeWidth={1.5} className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
          <span className="font-body text-[13px] text-white/70">Show the whole room</span>
        </button>
      )}

      {loading && items.length === 0 ? (
        <FeedSkeleton variant={variant} />
      ) : (
        <ul className={variant === "tile" ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2.5"}>
          {visible.map(({ product, confirmed }) => (
            <li key={product.id}>
              {variant === "tile" ? (
                <TileCard product={product} confirmed={confirmed} onNavigate={onNavigate} />
              ) : (
                <DetailedCard product={product} confirmed={confirmed} onNavigate={onNavigate} />
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] px-4 py-3 font-body text-[13px] text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white/85"
        >
          {moreLabel}
          <ChevronDown strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        </button>
      )}
    </section>
  );
}

/**
 * The project feed's card: the photograph, and nothing else.
 *
 * The name is not dropped, only un-drawn — it is the link's accessible name and
 * its tooltip, so a screen reader announces the product and a pointer reveals
 * it. What the design refuses is a caption under every tile, which would turn a
 * wall of objects into a list of words.
 */
function TileCard({
  product,
  confirmed,
  onNavigate,
}: {
  product: FeedProduct;
  confirmed: boolean;
  onNavigate?: () => void;
}) {
  const label = product.brandName ? `${product.title} — ${product.brandName}` : product.title;
  return (
    <Link
      href={product.href}
      onClick={onNavigate}
      title={label}
      aria-label={confirmed ? `${label} — used in this project` : label}
      className="group relative block overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="relative block aspect-square">
        {product.cover && (
          <Image
            src={product.cover}
            alt=""
            fill
            sizes="(max-width: 1279px) 45vw, 180px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
      </span>
      {confirmed && <UsedHereChip />}
    </Link>
  );
}

/** The product feed's card: image, name, brand, save. Nothing else. */
function DetailedCard({
  product,
  confirmed,
  onNavigate,
}: {
  product: FeedProduct;
  confirmed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.04]">
      <Link
        href={product.href}
        onClick={onNavigate}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <span className="relative block aspect-square">
          {product.cover && (
            <Image
              src={product.cover}
              alt=""
              fill
              sizes="(max-width: 1279px) 45vw, 180px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          )}
        </span>
        <span className="block px-2.5 pb-2.5 pt-2">
          <span className="block truncate font-body text-[12.5px] leading-[17px] text-white/85">
            {product.title}
          </span>
          {product.brandName && (
            <span className="block truncate font-body text-[11.5px] leading-[16px] text-white/40">
              {product.brandName}
            </span>
          )}
        </span>
      </Link>

      {/* The platform's one save mechanism, not a second bookmark. */}
      <span className="absolute right-1.5 top-1.5">
        <SaveToggle
          listingId={product.id}
          entityType="product"
          entityTitle={product.title}
          variant="card"
          align="left"
          tone="dark"
        />
      </span>

      {confirmed && <UsedHereChip />}
    </div>
  );
}

/**
 * The claim, made once, on the item it is true of.
 *
 * There is no variant of this that renders beside a suggestion: it is only
 * reachable from the branch that maps the `exact` array.
 */
function UsedHereChip() {
  return (
    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/75 px-2 py-0.5 font-body text-[9px] uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
      Used here
    </span>
  );
}

/** Placeholders sized like the cards, so the panel does not jump. */
function FeedSkeleton({ variant }: { variant: FeedVariant }) {
  return (
    <ul className="grid grid-cols-2 gap-2" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i}>
          <span className="block aspect-square animate-pulse rounded-xl bg-white/[0.05] motion-reduce:animate-none" />
          {variant === "detailed" && (
            <span className="mt-1.5 block h-[12px] w-3/4 rounded bg-white/[0.05]" />
          )}
        </li>
      ))}
    </ul>
  );
}
