import Link from "next/link";
import Image from "next/image";
import type { ListingCardData } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { MetaRow } from "./MetaRow";
import { AvatarStack, type AvatarItem } from "./AvatarStack";
import { LogoStack, type LogoItem } from "./LogoStack";
import { formatConnections } from "./connectionsLabel";

const FALLBACK = "Not specified";
const SQM_TO_SQFT = 10.7639;
const MAX_TEAM = 3;
const MAX_BRANDS = 4;

export interface ProjectCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. When not provided, uses getListingUrl(listing). */
  href?: string | null;
  /** Owner display name. Shown only when provided. */
  postedBy?: string | null;
  /** Location text (overrides listing.location if provided) */
  location?: string | null;
  /** Area in sqm; will be converted to sqft for display */
  areaSqm?: number | null;
  /** Area already in sqft (use if not sqm); falls back to listing.area_sqft */
  areaSqft?: number | null;
  /** Team member avatars (optional override); otherwise derived from listing.team_members */
  teamAvatars?: AvatarItem[];
  /** Brand logos (optional override); otherwise derived from listing.brands_used */
  brandLogos?: LogoItem[];
}

function formatArea(areaSqm?: number | null, areaSqft?: number | null): string {
  if (areaSqft != null && !Number.isNaN(areaSqft)) {
    return `${Math.round(areaSqft)} sqft`;
  }
  if (areaSqm != null && !Number.isNaN(areaSqm)) {
    return `${Math.round(areaSqm * SQM_TO_SQFT)} sqft`;
  }
  return FALLBACK;
}

export function ProjectCard({
  listing,
  imageUrl,
  href,
  postedBy,
  location,
  areaSqm,
  areaSqft,
  teamAvatars,
  brandLogos,
}: ProjectCardProps) {
  const metaLocation = (location ?? listing.location)?.trim() || FALLBACK;
  const areaSqftResolved = areaSqft ?? listing.area_sqft;
  const hasArea =
    (areaSqftResolved != null && !Number.isNaN(areaSqftResolved)) ||
    (areaSqm != null && !Number.isNaN(areaSqm));
  const metaArea = hasArea ? formatArea(areaSqm, areaSqftResolved) : "";
  const metaYear =
    listing.year != null && String(listing.year).trim() !== ""
      ? String(listing.year).trim()
      : FALLBACK;
  const postedByLabel = postedBy?.trim() || null;

  const team = listing.team_members ?? [];
  const brands = listing.brands_used ?? [];
  const materials = listing.materials ?? [];
  const teamAvatarsResolved: AvatarItem[] =
    teamAvatars ??
    team.slice(0, MAX_TEAM).map((m) => ({ name: m.name?.trim() || "?" }));
  const brandLogosResolved: LogoItem[] =
    brandLogos ??
    brands.slice(0, MAX_BRANDS).map((b) => ({
      name: b.name?.trim() || "?",
      src: b.logo_url ?? null,
    }));

  const viewsCount = listing.views_count ?? 0;
  const savesCount = listing.saves_count ?? 0;
  const hasCounts = viewsCount > 0 || savesCount > 0;
  const connectionsText = formatConnections(listing.connection_count);
  const hasTeam = teamAvatarsResolved.length > 0;
  const hasBrands = brandLogosResolved.length > 0;
  const hasMaterials = materials.length > 0;
  const hasFooterContent = hasTeam || hasBrands || connectionsText != null || hasMaterials;

  const linkHref = (href?.trim() || "") || getListingUrl(listing);

  return (
    <Link
      href={linkHref}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-archtivy-primary/50 hover:shadow focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950"
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
            className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500"
            aria-hidden
          >
            <span className="text-sm font-medium">{FALLBACK}</span>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-medium tracking-tight text-zinc-900 group-hover:text-archtivy-primary dark:text-zinc-100 dark:group-hover:text-archtivy-primary line-clamp-2">
          {listing.title?.trim() || FALLBACK}
        </h3>
        {postedByLabel && (
          <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">
            {postedByLabel}
          </p>
        )}
        <MetaRow
          items={[metaLocation, ...(hasArea ? [metaArea] : []), metaYear].filter(Boolean)}
          className="mt-1.5"
        />
        {hasMaterials && (
          <p className="mt-2 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
            {materials.map((m) => m.display_name).join(", ")}
          </p>
        )}
        {hasFooterContent && (
          <div className="mt-3 flex items-center justify-between gap-2 min-w-0">
            <AvatarStack avatars={teamAvatarsResolved} hideWhenEmpty />
            <div className="flex items-center gap-2">
              <LogoStack
                logos={brandLogosResolved}
                moreLabel="more brands"
                hideWhenEmpty
              />
              {connectionsText != null && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {connectionsText}
                </span>
              )}
            </div>
          </div>
        )}
        {hasCounts && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" aria-hidden>
            {viewsCount > 0 && <span>{viewsCount} views</span>}
            {viewsCount > 0 && savesCount > 0 && " · "}
            {savesCount > 0 && <span>{savesCount} saves</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
