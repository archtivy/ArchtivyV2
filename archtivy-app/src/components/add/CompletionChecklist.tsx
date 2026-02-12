"use client";

import { useMemo, useState } from "react";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface CompletionChecklistProps {
  items: ChecklistItem[];
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
}

export function CompletionChecklist({
  items,
  title = "Completion checklist",
  defaultCollapsed = false,
  className = "",
}: CompletionChecklistProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);
  const total = items.length;

  if (items.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 text-left focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 rounded-lg focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-900"
        aria-expanded={!collapsed}
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {doneCount}/{total}
        </span>
        <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
          {collapsed ? "▼" : "▲"}
        </span>
      </button>
      {!collapsed && (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done
                    ? "bg-archtivy-primary text-white"
                    : "border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                }`}
                aria-hidden
              >
                {item.done ? "✓" : ""}
              </span>
              <span
                className={
                  item.done
                    ? "text-zinc-600 dark:text-zinc-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
