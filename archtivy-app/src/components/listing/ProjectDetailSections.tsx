import Image from "next/image";
import type { ListingDetail, ListingDocument } from "@/lib/types/listings";
import { DownloadsSection } from "./DownloadsSection";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());
const hasText = (v: unknown) => toText(v).length > 0;

interface ProjectDetailSectionsProps {
  listing: ListingDetail;
  documents: ListingDocument[];
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

export function ProjectDetailSections({ listing, documents }: ProjectDetailSectionsProps) {
  const team = listing.team_members ?? [];
  const brands = listing.brands_used ?? [];
  const locationText = toText(listing.location);
  const hasLocation = hasText(listing.location);
  const areaSqft = listing.area_sqft != null && !Number.isNaN(listing.area_sqft) ? listing.area_sqft : null;
  const areaSqm = (listing as { area_sqm?: number | null }).area_sqm;
  const areaSqmValid = areaSqm != null && !Number.isNaN(areaSqm);
  const hasArea = areaSqft != null || areaSqmValid;
  const yearText = toText(listing.year);
  const hasYear = hasText(listing.year);
  const categoryText = toText(listing.category);
  const hasCategory = hasText(listing.category);
  const hasTeam = team.length > 0;
  const hasBrands = brands.length > 0;
  const hasDocuments = documents.length > 0;

  const hasAny =
    hasLocation || hasArea || hasYear || hasCategory || hasTeam || hasBrands || hasDocuments;
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {hasLocation && <InfoRow label="Location" value={locationText} />}
      {hasArea && (
        <InfoRow
          label="Area"
          value={
            areaSqft != null && areaSqmValid
              ? `${Math.round(areaSqft)} sqft (${Math.round(areaSqm!)} sqm)`
              : areaSqft != null
                ? `${Math.round(areaSqft)} sqft`
                : `${Math.round(areaSqm!)} sqm`
          }
        />
      )}
      {hasYear && <InfoRow label="Year" value={yearText} />}
      {hasCategory && <InfoRow label="Category" value={categoryText} />}

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
                  {(m.name?.trim() || "?")[0].toUpperCase()}
                </span>
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {m.name?.trim() || "—"}
                  </span>
                  {m.role?.trim() && (
                    <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {m.role.trim()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </dd>
        </div>
      )}

      {hasBrands && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Brands used
          </dt>
          <dd className="mt-2 flex flex-wrap gap-3">
            {brands.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {b.logo_url ? (
                  <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                    <Image
                      src={b.logo_url}
                      alt=""
                      width={32}
                      height={32}
                      className="object-contain"
                      unoptimized
                    />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {(toText(b.name) || "?")[0].toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {toText(b.name) || "—"}
                </span>
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
