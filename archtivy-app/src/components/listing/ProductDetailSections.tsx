import Image from "next/image";
import type { ListingDetail, ListingDocument } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";
import { DownloadsSection } from "./DownloadsSection";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());
const hasText = (v: unknown) => toText(v).length > 0;

interface ProductDetailSectionsProps {
  listing: ListingDetail;
  documents: ListingDocument[];
  /** Resolved brand profile (owner) for brand name + logo when listing is product */
  ownerProfile?: Profile | null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

export function ProductDetailSections({
  listing,
  documents,
  ownerProfile,
}: ProductDetailSectionsProps) {
  const team = listing.team_members ?? [];
  const hasBrand = ownerProfile && (ownerProfile.display_name ?? ownerProfile.username);
  const productTypeText = toText(listing.product_type);
  const hasProductType = hasText(listing.product_type);
  const featureText = toText(listing.feature_highlight);
  const hasFeature = hasText(listing.feature_highlight);
  const materialText = toText(listing.material_or_finish);
  const hasMaterial = hasText(listing.material_or_finish);
  const dimensionsText = toText(listing.dimensions);
  const hasDimensions = hasText(listing.dimensions);
  const yearText = toText(listing.year);
  const hasYear = hasText(listing.year);
  const hasTeam = team.length > 0;
  const hasDocuments = documents.length > 0;

  const hasAny =
    hasBrand ||
    hasProductType ||
    hasFeature ||
    hasMaterial ||
    hasDimensions ||
    hasYear ||
    hasTeam ||
    hasDocuments;
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {hasBrand && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Brand
          </dt>
          <dd className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
            {ownerProfile?.avatar_url ? (
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={ownerProfile.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  className="object-cover"
                  unoptimized
                />
              </span>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {(ownerProfile?.display_name ?? ownerProfile?.username ?? "?")[0].toUpperCase()}
              </span>
            )}
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {ownerProfile?.display_name ?? ownerProfile?.username ?? "—"}
            </span>
          </dd>
        </div>
      )}

      {hasProductType && (
        <InfoRow label="Product type" value={listing.product_type!.trim()} />
      )}
      {hasFeature && (
        <InfoRow label="Feature" value={listing.feature_highlight!.trim()} />
      )}
      {hasMaterial && (
        <InfoRow label="Materials / finish" value={listing.material_or_finish!.trim()} />
      )}
      {hasDimensions && (
        <InfoRow label="Dimensions" value={listing.dimensions!.trim()} />
      )}
      {hasYear && (
        <InfoRow label="Year" value={listing.year!.trim()} />
      )}

      {hasTeam && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Team
          </dt>
          <dd className="mt-2 flex flex-wrap gap-3">
            {team.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {(toText(m.name) || "?")[0].toUpperCase()}
                </span>
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {toText(m.name) || "—"}
                  </span>
                  {hasText(m.role) && (
                    <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {toText(m.role)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </dd>
        </div>
      )}

      {hasDocuments && (
        <div>
          <DownloadsSection documents={documents} />
        </div>
      )}
    </div>
  );
}
