import Link from "next/link";

export interface SubcategoryLinkItem {
  label: string;
  slug_path: string;
  description: string | null;
  listing_count?: number;
}

interface SubcategoryLinksProps {
  /** "projects" or "products" — used to build hrefs. */
  baseSegment: "projects" | "products";
  items: SubcategoryLinkItem[];
}

/**
 * Grid of child subcategory links shown on category archive pages.
 */
export function SubcategoryLinks({ baseSegment, items }: SubcategoryLinksProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-4">
        Subcategories
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.slug_path}
            href={`/${baseSegment}/${item.slug_path}`}
            className="group block rounded border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-[#002abf] hover:bg-zinc-50"
          >
            <span className="text-sm font-medium text-zinc-900 group-hover:text-[#002abf] transition-colors">
              {item.label}
            </span>
            {item.description && (
              <span className="mt-0.5 block text-xs text-zinc-500 line-clamp-1">
                {item.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
