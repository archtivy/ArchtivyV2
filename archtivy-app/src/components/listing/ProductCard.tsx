import Link from "next/link";
import Image from "next/image";
import type { ListingCardData } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { formatConnections } from "./connectionsLabel";

export interface ProductCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. When not provided, uses getListingUrl(listing). */
  href?: string | null;
  /** Owner display name. Shown under title with no prefix. */
  postedBy?: string | null;
}

export function ProductCard({
  listing,
  imageUrl,
  href,
  postedBy,
}: ProductCardProps) {
  const connectionsText = formatConnections(listing.connection_count);
  const linkHref = (href?.trim() || "") || getListingUrl(listing);
  const title = listing.title?.trim() || "Product";

  return (
    <Link
      href={linkHref}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-zinc-100 dark:bg-zinc-800/80">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            width={400}
            height={300}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500"
            aria-hidden
          >
            <span className="text-sm">—</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-medium tracking-tight text-zinc-900 group-hover:text-archtivy-primary dark:text-zinc-100 dark:group-hover:text-archtivy-primary line-clamp-2">
          {title}
        </h3>
        {postedBy && (
          <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {postedBy}
          </p>
        )}
        {connectionsText != null && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {connectionsText}
          </p>
        )}
      </div>
    </Link>
  );
}
