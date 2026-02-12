import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId, getProfilesByClerkIds } from "@/lib/db/profiles";
import { getSavedListingIds } from "@/lib/db/userSaves";
import { getListingsByIds } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { RemoveFromSavedButton } from "./RemoveFromSavedButton";
import type { ListingSummary } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const { data: savedIds } = await getSavedListingIds(userId);
  const ids = savedIds ?? [];

  const { data: listings, error } = await getListingsByIds(ids);
  const listingList = listings ?? [];
  const listingIds = listingList.map((l) => l.id);
  const imageResult =
    listingIds.length > 0
      ? await getFirstImageUrlPerListingIds(listingIds)
      : { data: {} as Record<string, string> };
  const imageMap = imageResult.data ?? {};

  const ownerIds = Array.from(
    new Set(
      listingList
        .map((l) => (l as ListingSummary & { owner_clerk_user_id?: string | null }).owner_clerk_user_id)
        .filter(Boolean) as string[]
    )
  );
  const { data: ownerProfiles } = await getProfilesByClerkIds(ownerIds);
  const ownerMap = (ownerProfiles ?? []).reduce<Record<string, Profile>>((acc, p) => {
    acc[p.clerk_user_id] = p;
    return acc;
  }, {});

  const tab = (await searchParams).tab ?? "all";
  const filtered =
    tab === "projects"
      ? listingList.filter((l) => l.type === "project")
      : tab === "products"
        ? listingList.filter((l) => l.type === "product")
        : listingList;

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Saved
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Your saved projects and products. Sorted by recently saved.
          </p>
        </div>

        <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800" aria-label="Saved tabs">
          <TabLink href="/me/saved?tab=all" active={tab === "all"}>
            All
          </TabLink>
          <TabLink href="/me/saved?tab=projects" active={tab === "projects"}>
            Projects
          </TabLink>
          <TabLink href="/me/saved?tab=products" active={tab === "products"}>
            Products
          </TabLink>
        </nav>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Could not load saved items. Please try again.
          </p>
        )}

        {!error && filtered.length === 0 && (
          <EmptyState
            title="No saved items"
            description="Save projects or products from explore to see them here."
          />
        )}

        {!error && filtered.length > 0 && (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Saved items">
            {filtered.map((listing) => {
              const ownerId = (listing as ListingSummary & { owner_clerk_user_id?: string | null }).owner_clerk_user_id;
              const ownerProfile = ownerId ? ownerMap[ownerId] : null;
              const displayName = ownerProfile?.display_name ?? ownerProfile?.username ?? null;

              return (
                <li key={listing.id} className="flex flex-col">
                  {listing.type === "project" ? (
                    <div className="flex flex-1 flex-col">
                      <ProjectCard
                        listing={listing}
                        imageUrl={imageMap[listing.id]}
                        postedBy={displayName}
                      />
                      <RemoveFromSavedButton listingId={listing.id} listingTitle={listing.title?.trim() || "Untitled"} />
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col">
                      <ProductCard
                        listing={listing}
                        imageUrl={imageMap[listing.id]}
                        brandName={displayName}
                      />
                      <RemoveFromSavedButton listingId={listing.id} listingTitle={listing.title?.trim() || "Untitled"} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-archtivy-primary text-archtivy-primary"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
