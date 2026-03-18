import Link from "next/link";

export interface CategoryHubItem {
  label: string;
  slug_path: string;
  description: string | null;
  listing_count: number;
  child_count: number;
}

interface CategoryHubGridProps {
  baseSegment: "projects" | "products";
  categories: CategoryHubItem[];
}

/**
 * Grid of top-level category cards shown on hub pages (/projects, /products).
 */
export function CategoryHubGrid({ baseSegment, categories }: CategoryHubGridProps) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <Link
          key={cat.slug_path}
          href={`/${baseSegment}/${cat.slug_path}`}
          className="group block rounded border border-zinc-200 bg-white p-5 transition-colors hover:border-[#002abf] hover:bg-zinc-50"
        >
          <h2 className="text-base font-medium text-zinc-900 group-hover:text-[#002abf] transition-colors">
            {cat.label}
          </h2>
          {cat.description && (
            <p className="mt-1.5 text-sm text-zinc-500 line-clamp-2">
              {cat.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
            {cat.listing_count > 0 && (
              <span>
                {cat.listing_count} {cat.listing_count === 1 ? "listing" : "listings"}
              </span>
            )}
            {cat.child_count > 0 && (
              <span>
                {cat.child_count} {cat.child_count === 1 ? "subcategory" : "subcategories"}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
