import type { ListingType } from "@/lib/types/listings";

interface TypeBadgeProps {
  type: ListingType;
  className?: string;
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const label = type === "project" ? "Project" : "Product";
  const style =
    "bg-archtivy-primary/20 text-archtivy-primary border-archtivy-primary/40";

  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${style} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
