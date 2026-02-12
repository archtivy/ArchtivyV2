import Link from "next/link";
import Image from "next/image";
import { TypeBadge } from "@/components/TypeBadge";
import { DetailActions } from "./DetailActions";
import type { ListingDetail } from "@/lib/types/listings";

interface ListingDetailHeroProps {
  listing: ListingDetail;
  /** Resolved owner display name */
  ownerDisplayName: string | null;
  /** Resolved owner username for /u/[username] link; if null no link */
  ownerUsername: string | null;
  /** Cover image URL (listing.cover_image_url or first gallery image) */
  coverImageUrl: string | null;
  isSaved: boolean;
}

export function ListingDetailHero({
  listing,
  ownerDisplayName,
  ownerUsername,
  coverImageUrl,
  isSaved,
}: ListingDetailHeroProps) {
  const ownerLabel = ownerDisplayName ?? ownerUsername ?? "Unknown";
  const viewsCount = listing.views_count ?? 0;
  const savesCount = listing.saves_count ?? 0;
  const hasCounts = viewsCount > 0 || savesCount > 0;

  return (
    <section className="space-y-4" aria-labelledby="listing-title">
      {/* Cover image */}
      {coverImageUrl && (
        <div className="relative aspect-[4/2] w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/80">
          <Image
            src={coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1040px"
            priority
            unoptimized
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1
            id="listing-title"
            className="text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-100"
          >
            {listing.title?.trim() || "Untitled"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TypeBadge type={listing.type} />
            {ownerUsername ? (
              <Link
                href={`/u/${encodeURIComponent(ownerUsername)}`}
                className="text-sm text-zinc-500 transition hover:text-archtivy-primary dark:text-zinc-400 dark:hover:text-archtivy-primary"
              >
                {ownerLabel}
              </Link>
            ) : (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{ownerLabel}</span>
            )}
          </div>
          {hasCounts && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400" aria-hidden>
              {viewsCount > 0 && <span>{viewsCount} views</span>}
              {viewsCount > 0 && savesCount > 0 && " · "}
              {savesCount > 0 && <span>{savesCount} saves</span>}
            </p>
          )}
        </div>
        <DetailActions listingId={listing.id} isSaved={isSaved} />
      </div>
    </section>
  );
}
