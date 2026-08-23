import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  DASHBOARD_WINDOWS,
  type DashboardStat,
  type DashboardWindow,
} from "@/lib/db/dashboard";

/**
 * Stat rail with a time-window selector.
 *
 * ── DESIGNED FOR SMALL NUMBERS ──────────────────────────────────────────────
 * The mockup's figures (24,847 · 342 · 128 · 32) do not exist on this platform:
 * the best-performing brand has 10 views, 3 projects featuring it and 1
 * download. A single digit has to look deliberate here, so the value is set in
 * the display face at a size that carries on its own, and nothing in the card
 * is sized on the assumption that the number is wide.
 *
 * Zero is rendered as "0", never as "—". A dash reads as "not measured"; the
 * measurement happened and the answer was none.
 */

function TrendPill({ trend }: { trend: number }) {
  const up = trend >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={[
        "inline-flex items-center gap-0.5 font-body text-[12px] tabular-nums",
        up ? "text-emerald-700" : "text-red-600",
      ].join(" ")}
    >
      <Icon strokeWidth={2} className="h-3.5 w-3.5" aria-hidden />
      {up ? "+" : ""}
      {trend}%
    </span>
  );
}

export function DashboardStats({
  stats,
  window: activeWindow,
  basePath = "/me/dashboard",
}: {
  stats: DashboardStat[];
  window: DashboardWindow;
  basePath?: string;
}) {
  // Server component: the selector is links, not state. Keeps the whole
  // dashboard a server render and makes each window a shareable URL.
  const anyWindowed = stats.some((s) => s.windowed);

  return (
    <section aria-label="Performance">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-body text-[13px] uppercase tracking-[0.14em] text-muted">
          Performance
        </h2>
        {anyWindowed && (
          <nav
            aria-label="Time window"
            className="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-cream p-0.5"
          >
            {DASHBOARD_WINDOWS.map((w) => {
              const active = w.id === activeWindow;
              return (
                <Link
                  key={w.id}
                  href={w.id === "all" ? basePath : `${basePath}?window=${w.id}`}
                  aria-current={active ? "true" : undefined}
                  scroll={false}
                  className={[
                    "rounded-full px-3 py-1 font-body text-[12px] transition-colors",
                    active
                      ? "bg-ink text-cream"
                      : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {w.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-hairline bg-white p-5"
          >
            <dt className="font-body text-[13px] leading-[18px] text-muted">
              {s.label}
            </dt>
            <dd className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-[34px] leading-none tracking-tight text-ink tabular-nums">
                {s.value.toLocaleString()}
              </span>
              {s.trend != null && <TrendPill trend={s.trend} />}
            </dd>
            {/* Only one of these ever renders: a trend's comparison basis, or
                the reason there is no trend. */}
            <p className="mt-2 font-body text-[11px] leading-[16px] text-muted">
              {s.trend != null
                ? "vs previous period"
                : s.note ?? (s.windowed ? "No prior period to compare" : "")}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}
