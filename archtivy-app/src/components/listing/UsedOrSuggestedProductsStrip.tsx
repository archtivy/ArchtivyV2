import Image from "next/image";
import Link from "next/link";

export interface StripProductItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  thumbnail?: string | null;
}

export interface UsedOrSuggestedProductsStripProps {
  /** Manual + photo_tag linked products (deduped). When set, section shows "Used products" with "Used" badge. */
  usedItems: StripProductItem[] | null;
  /** When usedItems is null or empty, show these with "Suggested" badge and helper text. Server-provided. */
  suggestedItems: StripProductItem[] | null;
}

export function UsedOrSuggestedProductsStrip({
  usedItems,
  suggestedItems,
}: UsedOrSuggestedProductsStripProps) {
  const showUsed = (usedItems?.length ?? 0) > 0;
  const items = showUsed ? usedItems! : (suggestedItems ?? []);
  const isSuggested = !showUsed;

  if (items.length === 0) return null;

  const title = showUsed ? "Used products" : "Suggested products";

  return (
    <section className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-normal uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {isSuggested && (
        <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          Suggested by AI (not confirmed).
        </p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug ?? item.id}`}
            className="group flex shrink-0 flex-col items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
            <div className="relative h-[92px] w-[92px] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt=""
                  fill
                  className="object-cover transition-opacity group-hover:opacity-90"
                  sizes="96px"
                  unoptimized={String(item.thumbnail).startsWith("http")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                  —
                </div>
              )}
            </div>
            <span className="max-w-[92px] truncate text-center text-xs text-zinc-600 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
              {item.title}
            </span>
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-normal ${
                showUsed
                  ? "border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
                  : "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
              }`}
            >
              {showUsed ? "Used" : "Suggested"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
