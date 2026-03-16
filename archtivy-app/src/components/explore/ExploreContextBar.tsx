"use client";

/**
 * Contextual insight bar that reacts to current filter results.
 * Shows: result count, top material, most common brand, dominant category.
 * Rendered below the filter bar, above the results grid.
 */

interface ContextInsight {
  label: string;
  value: string;
}

interface ExploreContextBarProps {
  total: number;
  /** Pre-computed insights passed from server (avoids extra fetch). */
  insights?: ContextInsight[];
}

export function ExploreContextBar({ total, insights = [] }: ExploreContextBarProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
        {total.toLocaleString()} result{total !== 1 ? "s" : ""}
      </span>
      {insights.map((insight) => (
        <span
          key={insight.label}
          className="whitespace-nowrap text-zinc-500 dark:text-zinc-400"
        >
          <span className="text-zinc-400 dark:text-zinc-500">{insight.label}:</span>{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{insight.value}</span>
        </span>
      ))}
    </div>
  );
}
