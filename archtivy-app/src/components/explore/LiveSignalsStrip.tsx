/**
 * LiveSignalsStrip — server component.
 *
 * Renders a horizontally scrollable strip of live market signals.
 * Relative timestamps are computed server-side (no client hook required).
 */
import type { MarketSignal } from "@/lib/db/intelligence";

// ─── Relative time (server-side) ─────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ─── Badge config ─────────────────────────────────────────────────────────────

type BadgeCfg = { label: string; bg: string; color: string };

const BADGE: Record<string, BadgeCfg> = {
  new_project:  { label: "Project",  bg: "#dbeafe", color: "#1d4ed8" },
  new_product:  { label: "Product",  bg: "#d1fae5", color: "#065f46" },
  product_used: { label: "Used",     bg: "#fef3c7", color: "#92400e" },
  new_brand:    { label: "Brand",    bg: "#ede9fe", color: "#5b21b6" },
  new_designer: { label: "Designer", bg: "#ccfbf1", color: "#134e4a" },
};

function SignalBadge({ type }: { type: string }) {
  const cfg: BadgeCfg = BADGE[type] ?? { label: type, bg: "#f1f5f9", color: "#475569" };
  return (
    <span
      className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LiveSignalsStripProps {
  signals: MarketSignal[];
}

export function LiveSignalsStrip({ signals }: LiveSignalsStripProps) {
  if (signals.length === 0) return null;

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center gap-3 py-2.5">
          {/* "LIVE" label */}
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "#002abf" }}
          >
            Live
          </span>

          {/* Divider */}
          <span className="h-3 w-px shrink-0 bg-zinc-200" aria-hidden />

          {/* Scrollable signal pills */}
          <div className="flex min-w-0 gap-2.5 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
            {signals.map((sig, i) => (
              <div
                key={`${sig.entity_id}-${i}`}
                className="flex shrink-0 items-center gap-2 rounded-[4px] border border-zinc-100 bg-zinc-50 px-3 py-1.5"
              >
                <SignalBadge type={sig.signal_type} />
                <span className="max-w-[220px] truncate text-[12px] text-zinc-700 sm:max-w-[300px]">
                  {sig.message}
                </span>
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {relativeTime(sig.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
