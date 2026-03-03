// ISR: data cache revalidates every hour; profile mutations bust it via
// revalidatePath("/u/[username]", "page") + revalidateTag(CACHE_TAGS.profiles).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getOwnedListingsForProfile } from "@/lib/db/listings";
import { getTaggedListingsForProfile, getCollaboratorsForListings } from "@/lib/db/listingTeamMembers";
import { getProjectIdsLinkedToProducts } from "@/lib/db/projectProductLinks";
import { getListingsByIds } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getAbsoluteUrl } from "@/lib/canonical";
import { buildProfileJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { listingToProjectForCard, listingToProductForCard } from "@/lib/profileCardData";
import type { ProjectOwner } from "@/lib/canonical-models";
import type { ListingCardData, ListingSummary } from "@/lib/types/listings";
import type { TaggedListingRow } from "@/lib/db/listingTeamMembers";

/** Per-username cached profile fetch; busted by revalidateTag(CACHE_TAGS.profiles). */
function getCachedProfile(username: string) {
  return unstable_cache(
    () => getProfileByUsername(username),
    [`profile:username:${username}`],
    { tags: [CACHE_TAGS.profiles, `profile:${username}`], revalidate: 3600 }
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const profileResult = await getCachedProfile(decoded);
  const profile = profileResult.data;
  if (!profile || (profile as { is_hidden?: boolean }).is_hidden === true) return {};
  const path = `/u/${encodeURIComponent(profile.username ?? username)}`;
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

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const profileResult = await getCachedProfile(decoded);
  const profile = profileResult.data;
  if (!profile) notFound();
  if ((profile as { is_hidden?: boolean }).is_hidden === true) notFound();

  const { userId } = await auth();
  const user = await currentUser();
  const ownerId = (profile as { owner_user_id?: string | null }).owner_user_id ?? profile.clerk_user_id;
  const isOwner = Boolean(userId && (userId === profile.clerk_user_id || userId === ownerId));
  const ownerClerkImageUrl = isOwner ? user?.imageUrl ?? null : null;
  const claimStatus = (profile as { claim_status?: string }).claim_status ?? "unclaimed";
  const showClaim = !isOwner && claimStatus !== "claimed";
  const claimPending = claimStatus === "pending";

  const ownerClerkIds = [
    profile.clerk_user_id,
    (profile as { owner_user_id?: string | null }).owner_user_id,
  ].filter(Boolean) as string[];

  const [ownedResult, taggedResult] = await Promise.all([
    getOwnedListingsForProfile(profile.id, ownerClerkIds),
    getTaggedListingsForProfile(profile.id),
  ]);

  const ownedListings = ownedResult.data ?? [];
  const projects = ownedListings.filter((l) => l.type === "project");
  const products = ownedListings.filter((l) => l.type === "product");
  const taggedListings = taggedResult.data ?? [];
  const taggedProjects = taggedListings.filter((l) => l.type === "project");
  const taggedProducts = taggedListings.filter((l) => l.type === "product");

  let usedInProjects: ListingSummary[] = [];
  if (products.length > 0) {
    const productIds = products.map((p) => p.id);
    const projectIdsResult = await getProjectIdsLinkedToProducts(productIds);
    const projectIds = projectIdsResult.data ?? [];
    if (projectIds.length > 0) {
      const usedResult = await getListingsByIds(projectIds);
      usedInProjects = usedResult.data ?? [];
    }
  }

  const allListingIds = [
    ...projects.map((p) => p.id),
    ...products.map((p) => p.id),
    ...usedInProjects.map((p) => p.id),
    ...taggedListings.map((p) => p.id),
  ];
  const imageResult =
    allListingIds.length > 0
      ? await getFirstImageUrlPerListingIds(allListingIds)
      : { data: {} as Record<string, string> };
  const imageMap = imageResult.data ?? {};

  // Collaborators: team members on this profile's owned listings
  const ownedListingIds = [...projects.map((p) => p.id), ...products.map((p) => p.id)];
  const collaboratorsResult = await getCollaboratorsForListings(profile.id, ownedListingIds);
  const collaborators = collaboratorsResult.data ?? [];

  const profileOwner: ProjectOwner = {
    displayName: profile.display_name ?? profile.username ?? "",
    username: profile.username ?? null,
    profileId: profile.id,
  };
  const firstListingForContact = projects[0] ?? products[0];
  const resolvedAvatarUrl = ownerClerkImageUrl ?? profile.avatar_url ?? null;

  const showLocation = profile.location_visibility !== "private";
  const locationText =
    [profile.location_city, profile.location_country].filter(Boolean).join(", ") ||
    profile.location_place_name ||
    null;
  const location = showLocation && locationText ? locationText : null;

  const showDiscipline =
    profile.role === "designer" &&
    profile.designer_discipline &&
    (profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false;
  const showBrandTypeLabel =
    profile.role === "brand" &&
    profile.brand_type &&
    (profile as { show_brand_type?: boolean }).show_brand_type !== false;

  const roleLabel =
    profile.role === "designer"
      ? showDiscipline
        ? (profile.designer_discipline as string)
        : "Architect / Designer"
      : profile.role === "brand"
      ? showBrandTypeLabel
        ? (profile.brand_type as string)
        : "Brand"
      : "Member";

  // Hero image: first project cover, then first product cover
  const heroImageUrl =
    (projects[0] ? imageMap[projects[0].id] : null) ??
    (products[0] ? imageMap[products[0].id] : null) ??
    null;

  // Hero stats
  const heroStats =
    profile.role === "brand"
      ? [
          { label: "Products", value: products.length },
          ...(usedInProjects.length > 0
            ? [{ label: "Used In", value: usedInProjects.length }]
            : []),
        ]
      : [
          { label: "Projects", value: projects.length },
          ...(taggedListings.length > 0
            ? [{ label: "Credited", value: taggedListings.length }]
            : []),
          ...(collaborators.length > 0
            ? [{ label: "Collaborators", value: collaborators.length }]
            : []),
        ];

  function taggedToCard(row: TaggedListingRow): ListingCardData {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: null,
      location: null,
      created_at: "",
      owner_clerk_user_id: null,
      owner_profile_id: null,
      cover_image_url: row.cover_image_url,
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
  }

  const profileUrl = getAbsoluteUrl(`/u/${encodeURIComponent(profile.username ?? decoded)}`);
  const jsonLd = buildProfileJsonLd(
    {
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      role: profile.role,
      bio: profile.bio,
      location_city: profile.location_city,
      location_country: profile.location_country,
      location_visibility: (profile as { location_visibility?: "public" | "private" }).location_visibility,
      website: profile.website,
    },
    profileUrl
  );

  const contactPayload = firstListingForContact
    ? {
        id: firstListingForContact.id,
        type: firstListingForContact.type as "project" | "product",
        title: firstListingForContact.title ?? "Listing",
      }
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {Object.keys(jsonLd).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}

      {/* ── Hero: full-bleed 60vh ── */}
      <ProfileHero
        name={profile.display_name ?? profile.username ?? "Profile"}
        roleLabel={roleLabel}
        location={location}
        heroImageUrl={heroImageUrl}
        stats={heroStats}
      />

      {/* ── Content: pulls 2.5rem up over hero bottom edge ── */}
      <div className="-mt-10 sm:-mt-14 relative z-10">
        {/* Mobile bio strip (hidden on lg+) */}
        <div className="block lg:hidden bg-white border-b border-zinc-100 px-4 py-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0">
              {resolvedAvatarUrl ? (
                <Image
                  src={resolvedAvatarUrl}
                  alt={profile.display_name ?? profile.username ?? "Avatar"}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-400">
                  {(profile.display_name ?? profile.username ?? "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {profile.bio && (
                <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">{profile.bio}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {profile.website && (
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-[#002abf] underline transition-colors"
                  >
                    Website
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-[#002abf] transition-colors"
                    aria-label="Instagram"
                  >
                    Instagram
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-[#002abf] transition-colors"
                    aria-label="LinkedIn"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex gap-8 lg:gap-10 items-start">
          {/* Left: sticky sidebar (desktop only) */}
          <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[72px] self-start">
            <ProfileSidebar
              profile={profile}
              isOwner={isOwner}
              resolvedAvatarUrl={resolvedAvatarUrl}
              showClaim={showClaim}
              claimPending={claimPending}
              firstListingForContact={contactPayload}
              collaborators={collaborators}
              decodedUsername={decoded}
            />
          </aside>

          {/* Right: main content */}
          <main className="min-w-0 flex-1 pb-16">
            {/* ── Designer: Projects ── */}
            {profile.role === "designer" && (
              <section id="projects">
                <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.18em] mb-5 mt-2 lg:mt-6">
                  Projects{projects.length > 0 ? ` · ${projects.length}` : ""}
                </h2>
                {projects.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-8">No projects yet.</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((listing) => (
                      <li key={listing.id}>
                        <ProjectCardPremium
                          project={listingToProjectForCard(
                            listing,
                            imageMap[listing.id] ?? null,
                            profileOwner
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* ── Brand: Products + Used In ── */}
            {profile.role === "brand" && (
              <>
                <section id="products">
                  <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.18em] mb-5 mt-2 lg:mt-6">
                    Products{products.length > 0 ? ` · ${products.length}` : ""}
                  </h2>
                  {products.length === 0 ? (
                    <p className="text-sm text-zinc-400 py-8">No products yet.</p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((listing) => (
                        <li key={listing.id}>
                          <ProductCardPremium
                            product={listingToProductForCard(
                              listing,
                              imageMap[listing.id] ?? null,
                              profileOwner
                            )}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {usedInProjects.length > 0 && (
                  <section id="used-in" className="mt-12">
                    <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.18em] mb-5">
                      Used In · {usedInProjects.length}
                    </h2>
                    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {usedInProjects.map((listing) => (
                        <li key={listing.id}>
                          <ProjectCardPremium
                            project={listingToProjectForCard(
                              listing,
                              imageMap[listing.id] ?? null,
                              null
                            )}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            {/* ── Credited In (all roles) ── */}
            {taggedListings.length > 0 && (
              <section id="credited" className="mt-12">
                <h2 className="text-[11px] font-medium text-zinc-400 uppercase tracking-[0.18em] mb-5">
                  Credited In · {taggedListings.length}
                </h2>
                {taggedProjects.length > 0 && (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                    {taggedProjects.map((row) => (
                      <li key={row.id}>
                        <ProjectCardPremium
                          project={listingToProjectForCard(
                            taggedToCard(row),
                            imageMap[row.id] ?? null,
                            null
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {taggedProducts.length > 0 && (
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {taggedProducts.map((row) => (
                      <li key={row.id}>
                        <ProductCardPremium
                          product={listingToProductForCard(
                            taggedToCard(row),
                            imageMap[row.id] ?? null,
                            null
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Mobile: sidebar actions below content */}
            <div className="block lg:hidden mt-10 space-y-4">
              {showClaim && (
                <div>
                  {claimPending ? (
                    <p className="text-sm text-amber-700">Claim request pending review.</p>
                  ) : (
                    <Link
                      href={`/u/${encodeURIComponent(profile.username ?? decoded)}/claim`}
                      className="text-sm text-zinc-400 hover:text-[#002abf] underline transition-colors"
                    >
                      Claim this profile
                    </Link>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
