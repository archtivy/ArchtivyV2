import Link from "next/link";
import type { ListingSummary } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { TypeBadge } from "./TypeBadge";

interface ListingCardProps {
  listing: ListingSummary;
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <li>
      <Link
        href={getListingUrl(listing)}
        className="flex items-start justify-between gap-3 px-4 py-4 text-left text-zinc-900 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800/50 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
            {listing.title}
          </h2>
          {listing.location ? (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{listing.location}</p>
          ) : (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {new Date(listing.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <TypeBadge type={listing.type} className="shrink-0" />
      </Link>
    </li>
  );
}
