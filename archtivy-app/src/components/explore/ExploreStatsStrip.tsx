import type { ExploreStatsType } from "@/lib/db/explore";

export interface ExploreStatsStripProps {
  type: ExploreStatsType;
  totalListings: number;
  totalConnections: number;
}

/**
 * CTA stats strip: "X curated projects/products connected with Y total connections".
 * Render only when stats are available (caller hides when null).
 */
export function ExploreStatsStrip({
  type,
  totalListings,
  totalConnections,
}: ExploreStatsStripProps) {
  const entityLabel = type === "projects" ? "projects" : "products";
  return (
    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {totalListings.toLocaleString()} curated {entityLabel}
      </span>
      {" connected with "}
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {totalConnections.toLocaleString()} total connections
      </span>
    </p>
  );
}
