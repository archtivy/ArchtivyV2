import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { getOwnedListingsForProfile } from "@/lib/db/listings";
import { getTaggedListingsForProfile } from "@/lib/db/listingTeamMembers";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getCanonicalUrl, getAbsoluteUrl } from "@/lib/canonical";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { Button } from "@/components/ui/Button";
import type { ListingCardData } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";

const ROLE_LABELS: Record<string, string> = {
  designer: "Designer",
  brand: "Brand",
  reader: "Reader",
};

const EMPTY_LISTING_CARD: Omit<ListingCardData, "id" | "type" | "title" | "cover_image_url"> = {
  description: null,
  location: null,
  created_at: "",
  owner_clerk_user_id: null,
  owner_profile_id: null,
  category: null,
  area_sqft: null,
  year: null,
  product_type: null,
  product_category: null,
  product_subcategory: null,
  feature_highlight: null,
  material_or_finish: null,
  dimensions: null,
  team_members: [],
  brands_used: [],
  views_count: 0,
  saves_count: 0,
  updated_at: null,
};

function taggedToCardData(
  row: { id: string; type: "project" | "product"; slug: string | null; title: string; cover_image_url: string | null }
): ListingCardData {
  return {
    ...EMPTY_LISTING_CARD,
    id: row.id,
    type: row.type,
    title: row.title,
    cover_image_url: row.cover_image_url,
  };
}

type ProfileRow = Profile & {
  claim_status?: string;
  created_by?: string;
  is_hidden?: boolean;
  is_claimable?: boolean;
};

function canShowClaimButton(profile: ProfileRow): boolean {
  if (profile.claim_status !== "unclaimed") return false;
  if (profile.created_by !== "archtivy") return false;
  if (profile.is_hidden === true) return false;
  if (profile.is_claimable === false) return false;
  return true;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profileId: string }>;
}): Promise<Metadata> {
  const { profileId } = await params;
  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data as ProfileRow | null;
  if (!profile || profile.is_hidden === true) {
    return { robots: { index: false, follow: false } };
  }
  if (profile.claim_status === "unclaimed") {
    return {
      robots: { index: false, follow: true },
      title: profile.display_name?.trim() || profile.username || "Profile",
      alternates: { canonical: getAbsoluteUrl(`/u/id/${profileId}`) },
    };
  }
  const path = `/u/id/${profileId}`;
  const title = profile.display_name?.trim() || profile.username || "Profile";
  const description = `${title} on Archtivy. Projects, products & credits for architecture.`;
  const imageUrl = profile.avatar_url?.startsWith("http") ? profile.avatar_url : undefined;
  return {
    title,
    description,
    alternates: { canonical: getAbsoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(path),
      ...(imageUrl && { images: [{ url: imageUrl, width: 200, height: 200, alt: title }] }),
    },
  };
}

export default async function ProfileByIdPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data;
  if (!profile) notFound();
  if ((profile as { is_hidden?: boolean }).is_hidden === true) notFound();

  const ownerClerkIds = [
    profile.clerk_user_id,
    (profile as { owner_user_id?: string | null }).owner_user_id,
  ].filter(Boolean) as string[];
  const [ownedResult, taggedResult] = await Promise.all([
    getOwnedListingsForProfile(profileId, ownerClerkIds),
    getTaggedListingsForProfile(profileId),
  ]);
  const ownedListings = ownedResult.data ?? [];
  const ownedProjects = ownedListings.filter((l) => l.type === "project");
  const ownedProducts = ownedListings.filter((l) => l.type === "product");
  const taggedListings = taggedResult.data ?? [];
  const taggedProjects = taggedListings.filter((l) => l.type === "project");
  const taggedProducts = taggedListings.filter((l) => l.type === "product");

  const allListingIds = [
    ...ownedListings.map((l) => l.id),
    ...taggedListings.map((l) => l.id),
  ];
  const imageResult =
    allListingIds.length > 0
      ? await getFirstImageUrlPerListingIds(allListingIds)
      : { data: {} as Record<string, string> };
  const imageMap = imageResult.data ?? {};

  const location = [profile.location_city, profile.location_country]
    .filter(Boolean)
    .join(", ");
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;
  const displayName = profile.display_name ?? profile.username ?? "Anonymous";
  const showClaim = canShowClaimButton(profile as ProfileRow);

  return (
    <div className="space-y-8">
      <ProfileHeader
        profile={profile}
        profileId={profileId}
        location={location}
        roleLabel={roleLabel}
        displayName={displayName}
        showClaimButton={showClaim}
      />

      {showClaim && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This profile was automatically created because this person was credited in a project on Archtivy.
        </p>
      )}

      {ownedListings.length > 0 && (
        <section id="published" className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Published
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Listings owned by this profile.
          </p>
          {ownedProjects.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ownedProjects.map((listing) => (
                <li key={listing.id}>
                  <ProjectCard
                    listing={listing}
                    imageUrl={imageMap[listing.id]}
                    href={getCanonicalUrl("project", (listing as { slug?: string }).slug ?? listing.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {ownedProducts.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {ownedProducts.map((listing) => (
                <li key={listing.id}>
                  <ProductCard
                    listing={listing}
                    imageUrl={imageMap[listing.id]}
                    href={getCanonicalUrl("product", (listing as { slug?: string }).slug ?? listing.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section id="tagged" className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Credited in
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Listings where this profile is credited as a team member (not owner).
        </p>
        {taggedListings.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            No credited listings yet.
          </p>
        ) : (
          <>
            {taggedProjects.length > 0 && (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {taggedProjects.map((row) => {
                  const listing = taggedToCardData(row);
                  const href = getCanonicalUrl("project", row.slug ?? row.id);
                  return (
                    <li key={row.id}>
                      <ProjectCard
                        listing={listing}
                        imageUrl={imageMap[row.id] ?? row.cover_image_url}
                        href={href}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {taggedProducts.length > 0 && (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {taggedProducts.map((row) => {
                  const listing = taggedToCardData(row);
                  const href = getCanonicalUrl("product", row.slug ?? row.id);
                  return (
                    <li key={row.id}>
                      <ProductCard
                        listing={listing}
                        imageUrl={imageMap[row.id] ?? row.cover_image_url}
                        href={href}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      <p>
        <Button as="link" href="/" variant="link">
          ← Back home
        </Button>
      </p>
    </div>
  );
}

function ProfileHeader({
  profile,
  profileId,
  location,
  roleLabel,
  displayName,
  showClaimButton,
}: {
  profile: Profile;
  profileId: string;
  location: string;
  roleLabel: string;
  displayName: string;
  showClaimButton: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className="shrink-0">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={96}
            height={96}
            className="rounded-full border border-zinc-200 dark:border-zinc-700"
            unoptimized
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-200 text-2xl font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
            {displayName[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {displayName}
          </h1>
          <span className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {roleLabel}
          </span>
          {profile.designer_discipline && profile.role === "designer" && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {profile.designer_discipline}
            </span>
          )}
          {profile.brand_type && profile.role === "brand" && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {profile.brand_type}
            </span>
          )}
          {profile.reader_type && profile.role === "reader" && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {profile.reader_type}
            </span>
          )}
        </div>
        {location && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {location}
          </p>
        )}
        {profile.bio && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
            {profile.bio}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {profile.website && (
            <a
              href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary"
            >
              Website
            </a>
          )}
          {profile.instagram && (
            <a
              href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary"
            >
              Instagram
            </a>
          )}
          {profile.linkedin && (
            <a
              href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary"
            >
              LinkedIn
            </a>
          )}
        </div>
        {showClaimButton && (
          <div className="mt-4">
            <Button
              as="link"
              href={`/u/id/${profileId}/claim`}
              variant="secondary"
            >
              Request claim
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
