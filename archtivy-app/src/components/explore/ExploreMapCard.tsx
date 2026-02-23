"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { ExploreMapItem, ExploreMapListingItem, ExploreMapProfileItem } from "@/lib/explore-map/types";
import { exploreItemKey } from "@/lib/explore-map/types";
import { getListingUrl } from "@/lib/canonical";

export interface ExploreMapCardProps {
  item: ExploreMapItem;
  highlighted: boolean;
  onHover: (key: string | null) => void;
}

export function ExploreMapCard({ item, highlighted, onHover }: ExploreMapCardProps) {
  const key = exploreItemKey(item);

  if (item.kind === "listing") {
    return (
      <ExploreMapProjectCard
        item={item}
        highlighted={highlighted}
        onMouseEnter={() => onHover(key)}
        onMouseLeave={() => onHover(null)}
      />
    );
  }
  return (
    <ExploreMapProfileCard
      item={item}
      highlighted={highlighted}
      onMouseEnter={() => onHover(key)}
      onMouseLeave={() => onHover(null)}
    />
  );
}

function ExploreMapProjectCard({
  item,
  highlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  item: ExploreMapListingItem;
  highlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const href = getListingUrl({ id: item.id, type: "project" });
  const location = [item.location_city, item.location_country].filter(Boolean).join(", ") || item.location_text || null;
  const meta: string[] = [];
  if (item.year) meta.push(item.year);
  if (item.project_category) meta.push(item.project_category);
  if (item.area_sqft != null && !Number.isNaN(item.area_sqft)) meta.push(`${Math.round(item.area_sqft)} sqft`);

  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block overflow-hidden rounded-lg border bg-white shadow-sm transition dark:bg-zinc-900 ${
        highlighted ? "border-[#002abf] ring-2 ring-[#002abf]/30" : "border-zinc-200 dark:border-zinc-800 hover:border-[#002abf]"
      }`}
      style={{ borderRadius: "4px" }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt=""
            fill
            className="object-cover"
            unoptimized={item.cover_image_url.startsWith("http")}
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">—</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
          {item.title?.trim() || "Untitled"}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Owner</p>
        {location && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{location}</p>
        )}
        {meta.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{meta.join(" · ")}</p>
        )}
      </div>
    </Link>
  );
}

function ExploreMapProfileCard({
  item,
  highlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  item: ExploreMapProfileItem;
  highlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const displayName = item.display_name?.trim() || item.username?.trim() || "—";
  const href = item.username ? `/u/${item.username}` : "#";
  const sub = item.role === "designer" ? (item.designer_discipline ?? "Designer") : (item.brand_type ?? "Brand");
  const location = [item.location_city, item.location_country].filter(Boolean).join(", ") || item.location_text || null;

  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`block overflow-hidden rounded-lg border bg-white p-4 shadow-sm transition dark:bg-zinc-900 ${
        highlighted ? "border-[#002abf] ring-2 ring-[#002abf]/30" : "border-zinc-200 dark:border-zinc-800 hover:border-[#002abf]"
      }`}
      style={{ borderRadius: "4px" }}
    >
      <div className="flex items-center gap-3">
        {item.avatar_url || item.cover_image_url ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <Image
              src={item.avatar_url || item.cover_image_url!}
              alt=""
              fill
              className="object-cover"
              unoptimized={(item.avatar_url || item.cover_image_url)?.startsWith("http")}
              sizes="48px"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{displayName}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{sub}</p>
          {location && <p className="text-xs text-zinc-500 dark:text-zinc-400">{location}</p>}
          {item.collaboration_open && (
            <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium text-[#002abf] bg-[#002abf]/10" style={{ borderRadius: "4px" }}>
              Open to collaborate
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
