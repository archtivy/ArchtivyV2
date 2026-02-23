import type { ExploreNetworkCounts } from "@/lib/db/explore";
import { Container } from "@/components/layout/Container";

export interface ExploreCountsHeroProps {
  counts: ExploreNetworkCounts | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function ExploreCountsHero({ counts }: ExploreCountsHeroProps) {
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
    <section className="border-b border-zinc-200/80 bg-white py-6 sm:py-8 dark:border-zinc-800/80 dark:bg-zinc-950" aria-label="Explore counts">
      <Container>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Explore
        </h1>
        {metaLine && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400" aria-hidden>
            {metaLine}
          </p>
        )}
      </Container>
    </section>
  );
}
