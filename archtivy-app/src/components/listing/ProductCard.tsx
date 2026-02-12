import Link from "next/link";
import Image from "next/image";
import type { ListingCardData } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { MetaRow } from "./MetaRow";
import { LogoStack, type LogoItem } from "./LogoStack";
import { formatConnections } from "./connectionsLabel";

const FALLBACK = "Not specified";
const MAX_BRANDS = 3;

export interface ProductCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. When not provided, uses getListingUrl(listing). */
  href?: string | null;
  /** Brand name (overrides when resolved from profile) */
  brandName?: string | null;
  /** Product type for meta row (falls back to listing.product_type) */
  productType?: string | null;
  /** One key feature for meta row (falls back to listing.feature_highlight) */
  keyFeature?: string | null;
  /** Logos for bottom row (falls back to listing.brands_used) */
  logos?: LogoItem[];
  /** Saved count override (falls back to listing.saves_count) */
  savedCount?: number | null;
  /** Used in X projects (TODO: from DB when column exists) */
  usedInProjects?: number | null;
}

export function ProductCard({
  listing,
  imageUrl,
  href,
  brandName,
  productType,
  keyFeature,
  logos,
  savedCount,
  usedInProjects,
}: ProductCardProps) {
  const brandLabel = (brandName ?? "")?.trim() || FALLBACK;
  const metaType = (productType ?? listing.product_type)?.trim() || FALLBACK;
  const metaFeature = (keyFeature ?? listing.feature_highlight)?.trim() || FALLBACK;

  const brands = listing.brands_used ?? [];
  const logosResolved: LogoItem[] =
    logos ??
    brands.slice(0, MAX_BRANDS).map((b) => ({
      name: b.name?.trim() || "?",
      src: b.logo_url ?? null,
    }));
  const materials = listing.materials ?? [];

  const connectionsText = formatConnections(listing.connection_count);
  const hasConnections = connectionsText != null;
  const saved = savedCount != null && !Number.isNaN(savedCount) ? savedCount : (listing.saves_count ?? 0);
  const used = usedInProjects != null && !Number.isNaN(usedInProjects) ? usedInProjects : 0;
  const viewsCount = listing.views_count ?? 0;
  const savedText = saved > 0 ? `${saved} saved` : null;
  const usedText = used > 0 && !hasConnections ? `Used in ${used} projects` : null;
  const hasViews = viewsCount > 0;
  const hasLogos = logosResolved.length > 0;
  const hasMaterials = materials.length > 0;
  const hasFooterContent =
    hasLogos || connectionsText != null || savedText != null || usedText != null || hasMaterials;

  const linkHref = (href?.trim() || "") || getListingUrl(listing);

  return (
    <Link
      href={linkHref}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-archtivy-primary/50 hover:shadow focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-zinc-100 dark:bg-zinc-800/80">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title || FALLBACK}
            width={400}
            height={300}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-zinc-500 dark:text-zinc-400"
            aria-hidden
          >
            <span className="text-sm font-medium">{FALLBACK}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-zinc-900 group-hover:text-archtivy-primary dark:text-zinc-100 dark:group-hover:text-archtivy-primary">
          {listing.title?.trim() || FALLBACK}
        </h3>
        <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">
          {brandLabel}
        </p>
        <MetaRow items={[metaType, metaFeature]} className="mt-1.5" />
        {hasMaterials && (
          <p className="mt-2 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {materials.map((m) => m.display_name).join(", ")}
          </p>
        )}
        {hasFooterContent && (
          <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <LogoStack logos={logosResolved} moreLabel="more" hideWhenEmpty />
              {connectionsText != null && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {connectionsText}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              {savedText && <span>{savedText}</span>}
              {usedText && <span>{usedText}</span>}
            </div>
          </div>
        )}
        {hasViews && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" aria-hidden>
            {viewsCount} views
          </p>
        )}
      </div>
    </Link>
  );
}
