import Link from "next/link";

export interface MetricRowProps {
  rank: number;
  name: string;
  /** The primary count (current_count from the RPC). */
  count: number;
  /** Short unit label rendered after the count, e.g. "uses", "new". */
  countLabel?: string;
  /** growth_pct from RPC, already a JS number. Omit for profile rows. */
  growthPct?: number;
  /** When true, renders "NEW" badge and suppresses growth_pct (it's trivially 100%). */
  isNewEntry?: boolean;
  /** Secondary line below the name — e.g. country for a city row, or listing_type. */
  subtext?: string;
  /** If provided, the whole row becomes a Next.js Link. */
  href?: string;
}

export function MetricRow({
  rank,
  name,
  count,
  countLabel,
  growthPct,
  isNewEntry = false,
  subtext,
  href,
}: MetricRowProps) {
  const positive = !isNewEntry && growthPct !== undefined && growthPct > 0;
  const negative = !isNewEntry && growthPct !== undefined && growthPct < 0;

  const inner = (
    <div className="group flex items-center gap-3 rounded-[4px] border border-transparent px-3 py-2.5 transition-colors hover:border-zinc-100 hover:bg-zinc-50/80">
      {/* Rank */}
      <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-300">
        {rank}
      </span>

      {/* Name + optional subtext */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-snug text-zinc-800 group-hover:text-zinc-900">
          {name}
        </span>
        {subtext && (
          <span className="block truncate text-[11px] leading-snug text-zinc-400">
            {subtext}
          </span>
        )}
      </div>

      {/* Right side: NEW badge OR growth %, then count */}
      <div className="flex shrink-0 items-center gap-2">
        {isNewEntry ? (
          <span
            className="rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: "#002abf1a", color: "#002abf" }}
          >
            new
          </span>
        ) : (
          growthPct !== undefined && (
            <span
              className={
                "text-[12px] font-semibold tabular-nums " +
                (positive ? "text-emerald-600" : negative ? "text-red-500" : "text-zinc-400")
              }
            >
              {positive ? "+" : ""}
              {growthPct.toFixed(1)}%
            </span>
          )
        )}

        <span className="min-w-[2.5rem] text-right text-[12px] tabular-nums text-zinc-500">
          {count.toLocaleString()}
          {countLabel && (
            <span className="ml-0.5 text-[10px] text-zinc-400">{countLabel}</span>
          )}
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {inner}
      </Link>
    );
  }

  return inner;
}
