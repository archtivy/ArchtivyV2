"use client";

import Link from "next/link";
import Image from "next/image";
import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";
import { getListingUrl } from "@/lib/canonical";
import { getCityLabel, getOwnerProfileHref } from "@/lib/cardUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ListingCardProjectProps = {
  type: "project";
  project: ProjectCanonical;
};

type ListingCardProductProps = {
  type: "product";
  product: ProductCanonical;
};

export type ListingCardProps = ListingCardProjectProps | ListingCardProductProps;

// ── Status badge labels ───────────────────────────────────────────────────────
// Only for notable non-default states — "completed" and "in_production" get no badge.

const PROJECT_BADGE_LABELS: Record<string, string> = {
  concept: "Concept",
  design_development: "In Development",
  under_construction: "Under Construction",
  competition_entry: "Competition",
  unbuilt: "Unbuilt",
};

const PRODUCT_BADGE_LABELS: Record<string, string> = {
  concept: "Concept",
  in_development: "In Development",
  prototype: "Prototype",
  limited_production: "Limited Edition",
  custom_made: "Custom Made",
  discontinued: "Discontinued",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatArea(sqft: number | null | undefined): string | null {
  if (!sqft) return null;
  return `${Math.round(sqft).toLocaleString()} sqft`;
}

function getProjectMetaLine(p: ProjectCanonical): string | null {
  const parts = [
    p.category?.trim() || null,
    p.year != null ? String(p.year) : null,
    formatArea(p.area_sqft),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("  ·  ") : null;
}

function getProductMetaLine(p: ProductCanonical): string | null {
  const parts = [
    (p.product_category ?? p.category)?.trim() || null,
    p.material_type?.trim() || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("  ·  ") : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ListingCard(props: ListingCardProps) {
  const isProject = props.type === "project";
  const item = isProject ? props.project : props.product;

  const href = getListingUrl({ id: item.id, type: props.type, slug: item.slug });
  const title = item.title?.trim() || (isProject ? "Untitled Project" : "Untitled Product");
  const cover = item.cover ?? null;

  const owner = item.owner ?? null;
  const ownerLabel = owner?.displayName?.trim() || null;
  const ownerHref = ownerLabel ? getOwnerProfileHref(owner) : null;

  // Status badge — only present after lifecycle migration is applied
  const badgeLabel = isProject
    ? (PROJECT_BADGE_LABELS[(props.project as ProjectCanonical).project_status ?? ""] ?? null)
    : (PRODUCT_BADGE_LABELS[(props.product as ProductCanonical).product_stage ?? ""] ?? null);

  // Location — projects only, merged into metadata
  const city = isProject ? getCityLabel(props.project) : null;
  const country = isProject ? (props.project.location?.country?.trim() ?? null) : null;
  const locationPart = city && country ? `${city}, ${country}` : city || country || null;

  // Metadata line — location + category/year/area or category/material
  const typePart = isProject
    ? getProjectMetaLine(props.project)
    : getProductMetaLine(props.product);

  const metaLine = [locationPart, typePart].filter(Boolean).join("  ·  ") || null;

  return (
    <article
      className="group flex flex-col overflow-hidden bg-white dark:bg-zinc-950"
      style={{ borderRadius: 6, border: "1px solid #eaeaea" }}
    >
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <Link
        href={href}
        className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#002abf]"
        style={{ backgroundColor: "#f5f5f5" }}
        tabIndex={-1}
        aria-hidden
      >
        {cover ? (
          <Image
            src={cover}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              style={{ color: "#d4d4d4" }}
            >
              <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.25" />
              <path d="M3 16.5l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {badgeLabel && (
          <span
            className="absolute left-3 top-3 z-10 backdrop-blur-sm"
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: 3,
              padding: "3px 7px",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#4b4b4b",
            }}
          >
            {badgeLabel}
          </span>
        )}
      </Link>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div
        className="flex flex-1 flex-col"
        style={{ padding: 16 }}
      >
        {/* Title */}
        <h3
          className="font-serif text-zinc-900 dark:text-zinc-100"
          style={{
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "calc(18px * 1.35 * 2)",
          }}
        >
          <Link
            href={href}
            className="focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#002abf] focus-visible:ring-offset-1"
          >
            {title}
          </Link>
        </h3>

        {/* Studio / Owner */}
        {ownerLabel && (
          <p
            className="truncate dark:!text-zinc-400"
            style={{ fontSize: 14, color: "#6b6b6b", marginTop: 6, lineHeight: 1.2 }}
          >
            {ownerHref ? (
              <Link
                href={ownerHref}
                className="transition-opacity duration-100 hover:opacity-60 focus:outline-none focus-visible:underline"
              >
                {ownerLabel}
              </Link>
            ) : (
              <span>{ownerLabel}</span>
            )}
          </p>
        )}

        {/* Metadata */}
        {metaLine && (
          <p
            className="line-clamp-1 dark:!text-zinc-500"
            style={{ fontSize: 13, color: "#8a8a8a", marginTop: 6, lineHeight: 1.4 }}
          >
            {metaLine}
          </p>
        )}
      </div>
    </article>
  );
}
