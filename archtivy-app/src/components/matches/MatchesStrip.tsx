"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MATCH_MIN_SCORE } from "@/lib/matches/constants";
import { selectTopMatches } from "@/lib/matches/display";
import type { MatchItem } from "./MatchItem";
import { MatchesDebugPanel } from "./MatchesDebugPanel";

export interface MatchesStripProps {
  type: "project" | "product";
  id: string;
  title: string;
  showBadge?: boolean;
  limit?: number;
}

const DEFAULT_LIMIT = 8;
const FETCH_LIMIT = 50;

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
    const url = `/api/matches/${type}?${param}=${encodeURIComponent(id)}&tier=all&limit=${FETCH_LIMIT}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, id]);

  const selected = React.useMemo(
    () => selectTopMatches(items, { minScore: MATCH_MIN_SCORE, limit }),
    [items, limit]
  );

  const baseHref = type === "project" ? "/products" : "/projects";
  const searchParams = useSearchParams();
  const debug =
    typeof window !== "undefined" && searchParams.has("matchesDebug");
  const showDevLine =
    typeof process !== "undefined" && process.env.NODE_ENV === "development";

  const topRawScores = React.useMemo(
    () =>
      [...items]
        .map((m) => m.score)
        .sort((a, b) => b - a)
        .slice(0, 5),
    [items]
  );

  if (loading) return null;

  return (
    <section className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-normal uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {debug && (
        <MatchesDebugPanel
          rawMatchesCount={items.length}
          shownCount={selected.length}
          minScore={MATCH_MIN_SCORE}
          limit={limit}
          topRawScores={topRawScores}
          showBelowThresholdMessage={
            items.length > 0 && selected.length === 0
          }
          className="mb-2"
        />
      )}
      {!debug && showDevLine && items.length > 0 && (
        <p className="mb-1 text-[10px] text-zinc-500 dark:text-zinc-500" aria-hidden>
          Matches: showing {selected.length} of {items.length} (minScore={MATCH_MIN_SCORE})
        </p>
      )}
      {selected.length === 0 ? (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No strong matches yet. Add more listings to improve connections.
          </p>
          {!debug && showDevLine && items.length > 0 && (
            <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-500" aria-hidden>
              Matches exist but are below threshold.
            </p>
          )}
        </>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {selected.map((item) => (
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
              <div className="flex flex-wrap items-center justify-center gap-1">
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
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500" aria-hidden>
                  {item.score}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
