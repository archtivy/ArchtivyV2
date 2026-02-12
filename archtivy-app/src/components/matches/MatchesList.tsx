"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { MatchItem } from "./MatchItem";

export interface MatchesListProps {
  type: "project" | "product";
  id: string;
  title: string;
  showBadge?: boolean;
  limit?: number;
  /** Lightbox variant: dark sidebar */
  variant?: "default" | "lightbox";
}

const DEFAULT_LIMIT = 8;

export function MatchesList({
  type,
  id,
  title: sectionTitle,
  showBadge = true,
  limit = DEFAULT_LIMIT,
  variant = "default",
}: MatchesListProps) {
  const [items, setItems] = React.useState<MatchItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const param = type === "project" ? "projectId" : "productId";
    const url = `/api/matches/${type}?${param}=${encodeURIComponent(id)}&tier=all&limit=${limit}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, id, limit]);

  if (loading || items.length === 0) return null;

  const baseHref = type === "project" ? "/products" : "/projects";
  const isLightbox = variant === "lightbox";

  return (
    <section className={isLightbox ? "mt-4" : ""}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {sectionTitle}
      </h2>
      <ul className="space-y-3" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${baseHref}/${item.slug}`}
              className={
                isLightbox
                  ? "flex gap-3 rounded-lg p-2 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                  : "flex gap-3 rounded-lg p-2 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:bg-zinc-800 dark:focus:ring-zinc-500"
              }
            >
              {item.primary_image ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-800">
                  <Image
                    src={item.primary_image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={item.primary_image.startsWith("http")}
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
                  —
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>
                {showBadge && (
                  <span
                    className={
                      item.tier === "verified"
                        ? "mt-0.5 inline-block rounded-full border border-emerald-500/80 px-1.5 py-0.5 text-[10px] text-emerald-400"
                        : "mt-0.5 inline-block rounded-full border border-zinc-500 px-1.5 py-0.5 text-[10px] text-zinc-400"
                    }
                  >
                    {item.tier === "verified" ? "Verified" : "Match"}
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
