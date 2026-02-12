"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { MatchItem } from "./MatchItem";

export interface MatchesStripProps {
  type: "project" | "product";
  id: string;
  title: string;
  showBadge?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 8;

export function MatchesStrip({
  type,
  id,
  title,
  showBadge = true,
  limit = DEFAULT_LIMIT,
}: MatchesStripProps) {
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

  const baseHref = type === "project" ? "/products" : "/projects";

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-normal uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`${baseHref}/${item.slug}`}
            className="group flex shrink-0 flex-col items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
            <div className="relative h-[92px] w-[92px] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              {item.primary_image ? (
                <Image
                  src={item.primary_image}
                  alt=""
                  fill
                  className="object-cover transition-opacity group-hover:opacity-90"
                  sizes="96px"
                  unoptimized={item.primary_image.startsWith("http")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</div>
              )}
            </div>
            <span className="max-w-[92px] truncate text-center text-xs text-zinc-600 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
              {item.title}
            </span>
            {showBadge && (
              <span
                className={
                  item.tier === "verified"
                    ? "rounded-full border border-emerald-500/60 px-1.5 py-0.5 text-[10px] font-normal text-emerald-600 dark:border-emerald-500/50 dark:text-emerald-400"
                    : "rounded-full border border-zinc-300 px-1.5 py-0.5 text-[10px] font-normal text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
                }
              >
                {item.tier === "verified" ? "Verified" : "Match"}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
