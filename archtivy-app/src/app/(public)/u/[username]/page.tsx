import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getOwnedListingsForProfile } from "@/lib/db/listings";
import { getTaggedListingsForProfile } from "@/lib/db/listingTeamMembers";
import { getProjectIdsLinkedToProducts } from "@/lib/db/projectProductLinks";
import { getListingsByIds } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getCanonicalUrl, getAbsoluteUrl } from "@/lib/canonical";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { Button } from "@/components/ui/Button";
import { ProfileEditButton } from "@/components/profile/ProfileEditButton";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import type { ListingCardData, ListingSummary } from "@/lib/types/listings";
import type { TaggedListingRow } from "@/lib/db/listingTeamMembers";

const ROLE_LABELS: Record<string, string> = {
  designer: "Designer",
  brand: "Brand",
  reader: "Reader",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const profileResult = await getProfileByUsername(decoded);
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

  const profileResult = await getProfileByUsername(decoded);
  const profile = profileResult.data;
  if (!profile) {
    notFound();
  }
  if ((profile as { is_hidden?: boolean }).is_hidden === true) {
    notFound();
  }

  const { userId } = await auth();
  const ownerId = (profile as { owner_user_id?: string | null }).owner_user_id ?? profile.clerk_user_id;
  const isOwner = Boolean(userId && (userId === profile.clerk_user_id || userId === ownerId));
  const claimStatus = (profile as { claim_status?: string }).claim_status ?? "unclaimed";
  const showClaim = !isOwner && claimStatus !== "claimed";
  const claimPending = claimStatus === "pending";

  const ownerClerkIds = [profile.clerk_user_id, (profile as { owner_user_id?: string | null }).owner_user_id].filter(Boolean) as string[];
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
  const postedBy = profile.display_name ?? profile.username ?? undefined;

  const location = [profile.location_city, profile.location_country]
    .filter(Boolean)
    .join(", ");
  const roleLabel = ROLE_LABELS[profile.role] ?? profile.role;

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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.username ?? "Avatar"}
              width={96}
              height={96}
              className="rounded-full border border-zinc-200 dark:border-zinc-700"
              unoptimized
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-200 text-2xl font-semibold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
              {(profile.display_name ?? profile.username ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {profile.display_name ?? profile.username ?? "Anonymous"}
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
          {isOwner && (
            <div className="mt-4">
              <ProfileEditButton
                profile={profile}
                editForm={<ProfileEditForm profile={profile} />}
              />
            </div>
          )}
          {showClaim && (
            <div className="mt-4">
              {claimPending ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Claim request submitted — awaiting review.
                </p>
              ) : (
                <Link
                  href={`/u/${encodeURIComponent(profile.username ?? decoded)}/claim`}
                  className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Claim this profile
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <nav className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800" aria-label="Profile sections">
        {profile.role === "designer" && (
          <Link
            href={`/u/${encodeURIComponent(profile.username!)}#projects`}
            className="border-b-2 border-archtivy-primary pb-2 text-sm font-medium text-archtivy-primary"
          >
            Projects ({projects.length})
          </Link>
        )}
        {profile.role === "brand" && (
          <>
            <Link
              href={`/u/${encodeURIComponent(profile.username!)}#products`}
              className="border-b-2 border-archtivy-primary pb-2 text-sm font-medium text-archtivy-primary"
            >
              Products ({products.length})
            </Link>
            <Link
              href={`/u/${encodeURIComponent(profile.username!)}#used-in`}
              className="border-b-2 border-transparent pb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Used in ({usedInProjects.length})
            </Link>
          </>
        )}
        {taggedListings.length > 0 && (
          <Link
            href={`/u/${encodeURIComponent(profile.username!)}#tagged`}
            className="border-b-2 border-transparent pb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Credited ({taggedListings.length})
          </Link>
        )}
        {profile.role === "reader" && (
          <span className="pb-2 text-sm text-zinc-500 dark:text-zinc-400">
            No listings (reader)
          </span>
        )}
      </nav>

      {profile.role === "designer" && (
        <section id="projects" className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Projects
          </h2>
          {projects.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No projects yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((listing) => (
                <li key={listing.id}>
                  <ProjectCard
                    listing={listing}
                    imageUrl={imageMap[listing.id]}
                    postedBy={postedBy}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {profile.role === "brand" && (
        <>
          <section id="products" className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Products
            </h2>
            {products.length === 0 ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                No products yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((listing) => (
                  <li key={listing.id}>
                    <ProductCard
                      listing={listing}
                      imageUrl={imageMap[listing.id]}
                      brandName={postedBy}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section id="used-in" className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Used in projects
            </h2>
            {usedInProjects.length === 0 ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                Not linked to any projects yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {usedInProjects.map((listing) => (
                  <li key={listing.id}>
                    <ProjectCard
                      listing={listing}
                      imageUrl={imageMap[listing.id]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {taggedListings.length > 0 && (
        <section id="tagged" className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Credited in
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Listings where this profile is credited as a team member (not owner).
          </p>
          {taggedProjects.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {taggedProjects.map((row) => (
                <li key={row.id}>
                  <ProjectCard
                    listing={taggedToCard(row)}
                    imageUrl={imageMap[row.id]}
                    href={getCanonicalUrl("project", row.slug ?? row.id)}
                  />
                </li>
              ))}
            </ul>
          )}
          {taggedProducts.length > 0 && (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {taggedProducts.map((row) => (
                <li key={row.id}>
                  <ProductCard
                    listing={taggedToCard(row)}
                    imageUrl={imageMap[row.id]}
                    href={getCanonicalUrl("product", row.slug ?? row.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!isOwner && (
        <p>
          <Button as="link" href="/" variant="link">
            ← Back home
          </Button>
        </p>
      )}
    </div>
  );
}
