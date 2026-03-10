"use client";

import Link from "next/link";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ProductListingCardProps {
  /** Cover image URL. */
  image?: string | null;
  /** Alt text for the image; falls back to title. */
  imageAlt?: string;
  /** Brand / studio display name. */
  brandName?: string | null;
  /** href for brand name link. Omit to render plain text. */
  brandHref?: string | null;
  /** Product title. Required. */
  title: string;
  /** href for product detail page. Required. */
  href: string;
  /**
   * Number of projects this product has been used in.
   * Rendered as a badge on the image when > 0.
   */
  connectionsCount?: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Unified editorial product card used across the entire platform.
 * Design: no outer border/shadow, rounded image only, Lato typography,
 * calm hover behaviour. Use this component everywhere a product is previewed.
 */
export function ProductListingCard({
  image,
  imageAlt,
  brandName,
  brandHref,
  title,
  href,
  connectionsCount = 0,
}: ProductListingCardProps) {
  const alt = imageAlt ?? title;

  return (
    <article
      className="group"
      style={{ fontFamily: "var(--font-lato, 'Lato', system-ui, sans-serif)" }}
    >
      {/* ── Image ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className="block focus:outline-none"
        >
          <div
            className="relative aspect-[4/3] w-full overflow-hidden"
            style={{ borderRadius: 4, backgroundColor: "#f5f5f5" }}
          >
            {image ? (
              <Image
                src={image}
                alt={alt}
                fill
                className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                aria-hidden
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  style={{ color: "#d4d4d4" }}
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M3 16.5l5-5 4 4 3-3 6 6"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
            )}

            {/* ── Connections badge ────────────────────────────────────── */}
            {connectionsCount > 0 && (
              <span
                className="absolute right-2 top-2 z-10"
                style={{
                  background: "rgba(0,0,0,0.58)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1,
                  padding: "4px 8px",
                  borderRadius: 999,
                  letterSpacing: "0.01em",
                  backdropFilter: "blur(2px)",
                  WebkitBackdropFilter: "blur(2px)",
                  whiteSpace: "nowrap",
                }}
              >
                {connectionsCount} connection{connectionsCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* ── Brand / Studio ────────────────────────────────────────────── */}
      {brandName && (
        <div style={{ marginBottom: 2 }}>
          {brandHref ? (
            <Link
              href={brandHref}
              className="text-zinc-900 transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:underline dark:text-zinc-100"
              style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}
            >
              {brandName}
            </Link>
          ) : (
            <span
              className="text-zinc-900 dark:text-zinc-100"
              style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}
            >
              {brandName}
            </span>
          )}
        </div>
      )}

      {/* ── Title ─────────────────────────────────────────────────────── */}
      <div>
        <Link
          href={href}
          className="text-zinc-900 transition-opacity duration-200 hover:opacity-60 focus:outline-none focus-visible:underline dark:text-zinc-100"
          style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.4 }}
        >
          {title}
        </Link>
      </div>
    </article>
  );
}
