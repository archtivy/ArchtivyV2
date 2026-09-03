"use client";

import Image from "next/image";
import Link from "next/link";
import { Undo2 } from "lucide-react";
import type { FeedProduct } from "./useImageDiscovery";

/**
 * The lightbox's right-hand product feed.
 *
 * ── CONFIRMED AND SUGGESTED CANNOT BE CONFUSED ──────────────────────────────
 * The two arrive in separate arrays and are rendered in separate sections with
 * different headings, and every confirmed card additionally carries a "Used
 * here" chip. There is no code path that can place a suggestion under the
 * confirmed heading, because there is no array that holds both.
 *
 * "Used in this project" means a person said so — a product_tags pin at
 * verified/official, or a project_product_links row. Nothing an AI produced
 * ever reaches the first section.
 *
 * ── THE INTELLIGENCE IS INVISIBLE ───────────────────────────────────────────
 * The API deliberately returns no labels, keywords, confidences or distances,
 * so there is nothing here to leak into the UI. No "92% match", no "detected:
 * seating", no style pills. A card shows a photograph, a name and a brand —
 * the same three things every other product card on Archtivy shows.
 *
 * ── WHY THE GRID IS EVEN, NOT MASONRY ───────────────────────────────────────
 * A true Pinterest column needs each image's intrinsic ratio, and this schema
 * stores none: listing_images has no width or height, and next/image needs a
 * box before the file loads. The alternatives were measuring on the client
 * (every card reflowing as it decodes, inside a panel the reader is already
 * scrolling) or inventing ratios. An even 4:5 grid is the honest third option,
 * and beside a photograph it reads calmer than a ragged one.
 */

export type FeedMode = "room" | "object";

export interface DiscoveryFeedProps {
  loading: boolean;
  /** Human-confirmed. Never AI output. */
  exact: FeedProduct[];
  /** Visually similar suggestions. */
  similar: FeedProduct[];
  mode: FeedMode;
  /** Present only in object mode: returns to the whole-room feed. */
  onClearSelection?: () => void;
  /** Where "Used in this project" links, when the project has such a page. */
  exactHref?: string | null;
  /**
   * Overrides the suggestion heading. A product lightbox has no room to fit,
   * so "Fits this space" would be nonsense there — but the section, the card
   * and the exact/suggested separation are identical, which is why this is a
   * word rather than a second component.
   */
  similarHeading?: string;
  onNavigate?: () => void;
}

export function DiscoveryFeed({
  loading,
  exact,
  similar,
  mode,
  onClearSelection,
  exactHref,
  similarHeading,
  onNavigate,
}: DiscoveryFeedProps) {
  const hasAnything = exact.length > 0 || similar.length > 0;

  /* Nothing to show and nothing coming: render nothing at all. The spec is
     explicit that an untagged photograph gets no empty state and no warning —
     the sidebar simply ends after the project's own details. */
  if (!loading && !hasAnything && mode === "room") return null;

  return (
    <section className="mt-4" aria-label="Products">
      {mode === "object" && onClearSelection && (
        <button
          type="button"
          onClick={onClearSelection}
          className="mb-4 flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
        >
          <Undo2 strokeWidth={1.5} className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
          <span className="font-body text-[13px] text-white/70">Show the whole room</span>
        </button>
      )}

      {exact.length > 0 && (
        <FeedSection
          heading={mode === "object" ? "Used here" : "Used in this project"}
          products={exact}
          confirmed
          href={mode === "room" ? exactHref ?? null : null}
          onNavigate={onNavigate}
        />
      )}

      {similar.length > 0 && (
        <FeedSection
          heading={
            mode === "object"
              ? exact.length > 0
                ? "Similar pieces"
                : "Similar to what you selected"
              : similarHeading ?? "Fits this space"
          }
          products={similar}
          confirmed={false}
          onNavigate={onNavigate}
        />
      )}

      {loading && !hasAnything && <FeedSkeleton />}
    </section>
  );
}

function FeedSection({
  heading,
  products,
  confirmed,
  href,
  onNavigate,
}: {
  heading: string;
  products: FeedProduct[];
  confirmed: boolean;
  href?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-7 last:mb-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
          {heading}
        </h3>
        {href && (
          <Link
            href={href}
            onClick={onNavigate}
            className="shrink-0 font-body text-[12px] text-white/45 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
          >
            See all
          </Link>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-2.5">
        {products.map((p) => (
          <li key={p.id}>
            <Link
              href={p.href}
              onClick={onNavigate}
              className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span className="relative block aspect-[4/5] overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.05]">
                {p.cover && (
                  <Image
                    src={p.cover}
                    alt=""
                    fill
                    sizes="(max-width: 1279px) 45vw, 180px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}
                {confirmed && (
                  /* The claim is made once, on the object it is true of. It is
                     never rendered on a suggestion, and there is no variant of
                     this chip that could be. */
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 font-body text-[9px] uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
                    Used here
                  </span>
                )}
              </span>
              <span className="mt-1.5 block truncate font-body text-[12.5px] leading-[17px] text-white/85">
                {p.title}
              </span>
              {p.brandName && (
                <span className="block truncate font-body text-[11.5px] leading-[16px] text-white/40">
                  {p.brandName}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Placeholders sized like the cards, so the panel does not jump when they land. */
function FeedSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-3 h-[11px] w-24 rounded bg-white/[0.07]" />
      <ul className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <span className="block aspect-[4/5] animate-pulse rounded-lg bg-white/[0.05] motion-reduce:animate-none" />
            <span className="mt-1.5 block h-[12px] w-3/4 rounded bg-white/[0.05]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
