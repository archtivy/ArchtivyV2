const FALLBACK = "Not specified";

interface MetaRowProps {
  /** Meta items shown joined by " • "; missing/empty shown as Not specified */
  items: (string | null | undefined)[];
  className?: string;
}

export function MetaRow({ items, className = "" }: MetaRowProps) {
  const parts = items.map((v) => (v?.trim() ? v.trim() : FALLBACK));
  return (
    <p
      className={`line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400 ${className}`.trim()}
    >
      {parts.join(" • ")}
    </p>
  );
}
