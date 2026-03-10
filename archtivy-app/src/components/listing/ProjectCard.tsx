import type { ListingCardData } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { ProjectListingCard, type ProjectListingCardAvatar } from "./ProjectListingCard";

const SQM_TO_SQFT = 10.7639;
const MAX_TEAM_AVATARS = 3;

export interface ProjectCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. */
  href?: string | null;
  /** Owner display name (already resolved by caller). */
  postedBy?: string | null;
  /** Location text override. */
  location?: string | null;
  /** Area in sqm — will be converted to sqft. */
  areaSqm?: number | null;
  /** Area already in sqft; takes precedence over areaSqm and listing.area_sqft. */
  areaSqft?: number | null;
}

export function ProjectCard({
  listing,
  imageUrl,
  href,
  postedBy,
  location,
  areaSqm,
  areaSqft,
}: ProjectCardProps) {
  const linkHref = href?.trim() || getListingUrl(listing);
  const title = listing.title?.trim() || "Project";

  // Location: caller override > listing.location
  const locationText = (location ?? listing.location)?.trim() || null;
  const locationHref = locationText
    ? `/explore/projects?city=${encodeURIComponent(locationText.split(",")[0]?.trim() ?? locationText)}`
    : null;

  // Year
  const yearDisplay = listing.year != null && String(listing.year).trim() !== "" ? String(listing.year).trim() : null;
  const yearHref = yearDisplay ? `/explore/projects?year=${yearDisplay}` : null;

  // Area in sqft
  const areaSqftResolved =
    areaSqft != null
      ? areaSqft
      : areaSqm != null
      ? Math.round(areaSqm * SQM_TO_SQFT)
      : listing.area_sqft != null
      ? listing.area_sqft
      : null;

  // Team member avatars
  const teamAvatars: ProjectListingCardAvatar[] = (listing.team_members ?? [])
    .slice(0, MAX_TEAM_AVATARS)
    .map((m) => ({ name: m.name?.trim() || "?" }));

  // Brand href from owner_profile_id (profile page will redirect to username URL)
  const studioHref = listing.owner_profile_id
    ? `/u/id/${listing.owner_profile_id}`
    : null;

  // Connection count: explicit field or derived from team + brands
  const connectionCount =
    (listing as { connection_count?: number }).connection_count ??
    (listing.team_members?.length ?? 0) + (listing.brands_used?.length ?? 0);

  return (
    <ProjectListingCard
      image={imageUrl}
      imageAlt={title}
      title={title}
      href={linkHref}
      studioName={postedBy ?? null}
      studioHref={studioHref}
      location={locationText}
      locationHref={locationHref}
      year={yearDisplay}
      yearHref={yearHref}
      areaSqft={areaSqftResolved}
      connectionCount={connectionCount}
      teamAvatars={teamAvatars}
      entityId={listing.id}
      entityTitle={title}
    />
  );
}
