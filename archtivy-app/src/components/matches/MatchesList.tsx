"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LIGHTBOX_MATCH_LIMIT, MATCH_MIN_SCORE } from "@/lib/matches/constants";
import { selectTopMatches } from "@/lib/matches/display";
import type { MatchItem } from "./MatchItem";
import { MatchesDebugPanel } from "./MatchesDebugPanel";

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
const FETCH_LIMIT = 50;

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
    const url = `/api/matches/${type}?${param}=${encodeURIComponent(id)}&tier=all&limit=${FETCH_LIMIT}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, id]);

  const isLightbox = variant === "lightbox";
  const displayLimit = isLightbox ? LIGHTBOX_MATCH_LIMIT : limit;
  const selected = React.useMemo(
    () => selectTopMatches(items, { minScore: MATCH_MIN_SCORE, limit: displayLimit }),
    [items, displayLimit]
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
    <section className={isLightbox ? "mt-4" : ""}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {sectionTitle}
      </h2>
      {debug && (
        <MatchesDebugPanel
          rawMatchesCount={items.length}
          shownCount={selected.length}
          minScore={MATCH_MIN_SCORE}
          limit={displayLimit}
          topRawScores={topRawScores}
          showBelowThresholdMessage={
            items.length > 0 && selected.length === 0
          }
          className="mb-2"
        />
      )}
      {!debug && showDevLine && items.length > 0 && (
        <p className="mb-1 text-[10px] text-zinc-500" aria-hidden>
          Matches: showing {selected.length} of {items.length} (minScore={MATCH_MIN_SCORE})
        </p>
      )}
      {selected.length === 0 ? (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No strong matches yet. Add more listings to improve connections.
          </p>
          {!debug && showDevLine && items.length > 0 && (
            <p className="mt-1 text-[10px] text-zinc-500" aria-hidden>
              Matches exist but are below threshold.
            </p>
          )}
        </>
      ) : (
        <ul className="space-y-3" role="list">
          {selected.map((item) => (
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {showBadge && (
                      <span
                        className={
                          item.tier === "verified"
                            ? "inline-block rounded-full border border-emerald-500/80 px-1.5 py-0.5 text-[10px] text-emerald-400"
                            : "inline-block rounded-full border border-zinc-500 px-1.5 py-0.5 text-[10px] text-zinc-400"
                        }
                      >
                        {item.tier === "verified" ? "Verified" : "Match"}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500" aria-hidden>
                      {item.score}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
