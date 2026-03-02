import type { UserListingStats } from "@/lib/db/userStats";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const STATS = [
  { key: "totalListings" as const, label: "Listings" },
  { key: "totalViews" as const, label: "Views" },
  { key: "totalSaves" as const, label: "Saves" },
  { key: "totalConnections" as const, label: "Connections" },
] satisfies { key: keyof UserListingStats; label: string }[];

/**
 * Premium minimal statistics strip for the listings dashboard.
 * Server component — receives pre-aggregated stats, no client-side computation.
 */
export function ListingStatsStrip({ stats }: { stats: UserListingStats }) {
  return (
    <div
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800"
      role="list"
      aria-label="Listing statistics"
    >
      {STATS.map(({ key, label }) => (
        <div
          key={key}
          role="listitem"
          className="flex flex-col gap-0.5 bg-white px-5 py-4 dark:bg-zinc-900"
        >
          <span className="text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
            {fmt(stats[key])}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
      ))}
    </div>
  );
}
