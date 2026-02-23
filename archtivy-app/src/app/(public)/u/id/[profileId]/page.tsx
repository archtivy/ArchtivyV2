import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { getOwnedListingsForProfile } from "@/lib/db/listings";
import { getTaggedListingsForProfile } from "@/lib/db/listingTeamMembers";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getAbsoluteUrl } from "@/lib/canonical";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import { Button } from "@/components/ui/Button";
import { listingToProjectForCard, listingToProductForCard } from "@/lib/profileCardData";
import type { ProjectOwner } from "@/lib/canonical-models";
import type { ListingCardData } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";

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
  const profileOwner: ProjectOwner = {
    displayName: profile.display_name ?? profile.username ?? "",
    username: profile.username ?? null,
    profileId: profile.id,
  };
  const firstListingForContact = ownedProjects[0] ?? ownedProducts[0];

  const showLocation = profile.location_visibility !== "private";
  const locationText =
    [profile.location_city, profile.location_country].filter(Boolean).join(", ") ||
    profile.location_place_name ||
    null;
  const location = showLocation && locationText ? locationText : null;
  const displayName = profile.display_name ?? profile.username ?? "Anonymous";
  const showClaim = canShowClaimButton(profile as ProfileRow);
  const showDiscipline =
    profile.role === "designer" &&
    profile.designer_discipline &&
    (profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false;
  const showBrandTypeLabel =
    profile.role === "brand" &&
    profile.brand_type &&
    (profile as { show_brand_type?: boolean }).show_brand_type !== false;

  return (
    <div className="space-y-8">
      <ProfileHeader
        profile={profile}
        profileId={profileId}
        location={location ?? ""}
        displayName={displayName}
        showClaimButton={showClaim}
        showDiscipline={Boolean(showDiscipline)}
        showBrandTypeLabel={Boolean(showBrandTypeLabel)}
        firstListingForContact={firstListingForContact}
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
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ownedProjects.map((listing) => (
                <li key={listing.id}>
                  <ProjectCardPremium
                    project={listingToProjectForCard(listing, imageMap[listing.id] ?? null, profileOwner)}
                  />
                </li>
              ))}
            </ul>
          )}
          {ownedProducts.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ownedProducts.map((listing) => (
                <li key={listing.id}>
                  <ProductCardPremium
                    product={listingToProductForCard(listing, imageMap[listing.id] ?? null, profileOwner)}
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
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {taggedProjects.map((row) => {
                  const listing = taggedToCardData(row);
                  return (
                    <li key={row.id}>
                      <ProjectCardPremium
                        project={listingToProjectForCard(listing, imageMap[row.id] ?? row.cover_image_url ?? null, null)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            {taggedProducts.length > 0 && (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {taggedProducts.map((row) => {
                  const listing = taggedToCardData(row);
                  return (
                    <li key={row.id}>
                      <ProductCardPremium
                        product={listingToProductForCard(listing, imageMap[row.id] ?? row.cover_image_url ?? null, null)}
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
  displayName,
  showClaimButton,
  showDiscipline,
  showBrandTypeLabel,
  firstListingForContact,
}: {
  profile: Profile;
  profileId: string;
  location: string;
  displayName: string;
  showClaimButton: boolean;
  showDiscipline: boolean;
  showBrandTypeLabel: boolean;
  firstListingForContact?: ListingCardData | null;
}) {
  return (
    <div className="border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-8" style={{ borderRadius: 4 }}>
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={displayName}
              width={120}
              height={120}
              className="rounded-full border border-zinc-200 dark:border-zinc-700"
              unoptimized
            />
          ) : (
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-200 text-3xl font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-100">
            {displayName}
          </h1>
          {(showDiscipline || showBrandTypeLabel) && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {showDiscipline && profile.designer_discipline}
              {showDiscipline && showBrandTypeLabel && " · "}
              {showBrandTypeLabel && profile.brand_type}
            </p>
          )}
          {location && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {location}
            </p>
          )}
          {profile.bio && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {profile.bio}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-archtivy-primary"
                aria-label="Website"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            )}
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-archtivy-primary"
                aria-label="Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            )}
            {profile.linkedin && (
              <a
                href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-archtivy-primary"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
          </div>
          {firstListingForContact && (
            <div className="mt-4">
              <ProfileContactButton
                listingId={firstListingForContact.id}
                listingType={firstListingForContact.type === "product" ? "product" : "project"}
                listingTitle={firstListingForContact.title ?? "Listing"}
              />
            </div>
          )}
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
    </div>
  );
}
