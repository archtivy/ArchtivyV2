import type { ExploreNetworkCounts } from "@/lib/db/explore";

export interface ExploreHeaderProps {
  counts: ExploreNetworkCounts | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ExploreHeader({ counts }: ExploreHeaderProps) {
  const parts: string[] = [];
  if (counts != null) {
    parts.push(`${formatCount(counts.projectCount)} Projects`);
    parts.push(`${formatCount(counts.productCount)} Products`);
    if (counts.connectionCount != null) {
      parts.push(`${formatCount(counts.connectionCount)} Connections`);
    }
  }
  const metaLine = parts.length > 0 ? parts.join(" · ") : null;

  return (
    <header className="border-b border-zinc-200/80 bg-white pb-4 pt-2 dark:border-zinc-800/80 dark:bg-zinc-950">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Explore the Network
      </h2>
      {metaLine && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400" aria-hidden>
          {metaLine}
        </p>
      )}
    </header>
  );
}
