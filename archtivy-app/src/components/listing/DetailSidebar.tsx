import Link from "next/link";
import type { ReactNode } from "react";

export interface DetailSidebarRow {
  label: string;
  value: ReactNode;
  href?: string;
}

export interface DetailSidebarProps {
  title: "Project details" | "Product details";
  rows: DetailSidebarRow[];
}

/**
 * Sticky sidebar with factual listing fields only. Rows are hidden when value is empty.
 * Rows with href are clickable (explore filters or profile links).
 */
export function DetailSidebar({ title, rows }: DetailSidebarProps) {
  const visible = rows.filter((r) => r.value != null && r.value !== "");
  if (visible.length === 0) return null;

  return (
    <aside
      className="sticky top-6 self-start rounded-xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/80"
      aria-labelledby="detail-sidebar-title"
    >
      <h2
        id="detail-sidebar-title"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        {title}
      </h2>
      <dl className="space-y-3">
        {visible.map((row) => (
          <div key={row.label} className="border-b border-zinc-200/80 pb-3 last:border-0 last:pb-0 dark:border-zinc-700/80">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {row.href ? (
                <Link
                  href={row.href}
                  className="transition hover:text-archtivy-primary hover:underline dark:hover:text-archtivy-primary"
                >
                  {row.value}
                </Link>
              ) : (
                <span>{row.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
