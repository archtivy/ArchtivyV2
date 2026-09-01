import { Eye, Bookmark, Share2, Users } from "lucide-react";
import type { WorkspaceMetric } from "@/lib/db/workspaceMetrics";

const NUMBER = new Intl.NumberFormat("en-US");

const ICONS: Record<WorkspaceMetric["id"], typeof Eye> = {
  views: Eye,
  saves: Bookmark,
  connections: Share2,
  followers: Users,
};

/**
 * The four headline numbers.
 *
 * ── NO TREND CHIPS ──────────────────────────────────────────────────────────
 * The reference puts a green "↑18%" beside every figure. Nothing in this
 * database can produce one: views_count is a running counter with no event
 * history, and follows/folder_items are too sparse (9 and 12 rows platform-
 * wide) for a window comparison to mean anything. Rather than render a chip
 * that is always absent, the type has no trend field at all — see the note in
 * lib/db/workspaceMetrics. The row is designed to look finished without it.
 */
export function WorkspaceMetricCards({ metrics }: { metrics: WorkspaceMetric[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map((m) => {
        const Icon = ICONS[m.id];
        return (
          <li
            key={m.id}
            className="rounded-xl border border-hairline bg-white px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <p className="min-w-0 truncate font-body text-[13px] text-muted">{m.label}</p>
            </div>
            <p className="mt-1.5 font-display text-[24px] leading-none tracking-tight text-ink">
              {NUMBER.format(m.value)}
            </p>
            {m.note && (
              <p className="mt-1.5 font-body text-[11px] leading-[15px] text-muted">{m.note}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
