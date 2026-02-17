import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getFolder, getFolderItems } from "@/app/actions/savedFolders";
import type { FolderItemWithCreated } from "@/app/actions/savedFolders";
import { getListingsByIds } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfilesByClerkIds } from "@/lib/db/profiles";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { BoardDetailFilters } from "./BoardDetailFilters";
import type { ListingSummary } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";

type FilterTab = "all" | "projects" | "products";
type SortOption = "recent" | "name";

export default async function SavedFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{ filter?: string; sort?: string; q?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { folderId } = await params;
  const { filter = "all", sort = "recent", q: searchQuery = "" } = await searchParams;
  const filterTab = (filter === "projects" || filter === "products" ? filter : "all") as FilterTab;
  const sortOption = (sort === "name" ? "name" : "recent") as SortOption;

  const folderResult = await getFolder(folderId);
  if (folderResult.ok !== true) notFound();
  const folder = folderResult.data!;

  const itemsResult = await getFolderItems(folderId);
  if (itemsResult.ok !== true) notFound();
  const items = itemsResult.data ?? [];

  let filteredItems: FolderItemWithCreated[] = items;
  if (filterTab === "projects") filteredItems = items.filter((i) => i.entity_type === "project");
  else if (filterTab === "products") filteredItems = items.filter((i) => i.entity_type === "product");

  const listingIds = filteredItems.map((i) => i.entity_id);
  const { data: listings, error } = await getListingsByIds(listingIds);
  const listingList = listings ?? [];
  const listingById = Object.fromEntries(listingList.map((l) => [l.id, l]));

  let searchFilteredIds = listingIds;
  const q = searchQuery.trim().toLowerCase();
  if (q && listingList.length > 0) {
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
    const matchListingId = (id: string): boolean => {
      const listing = listingById[id] as ListingSummary | undefined;
      if (!listing) return false;
      const title = (listing.title ?? "").toLowerCase();
      const ownerId = (listing as ListingSummary & { owner_clerk_user_id?: string | null }).owner_clerk_user_id;
      const owner = ownerId ? ownerMap[ownerId] : null;
      const studioBrand = [owner?.display_name, owner?.username].filter(Boolean).join(" ").toLowerCase();
      return title.includes(q) || studioBrand.includes(q);
    };
    searchFilteredIds = listingIds.filter(matchListingId);
  }

  const itemOrder = new Map(filteredItems.map((it, idx) => [it.entity_id, { item: it, createdAt: it.created_at, index: idx }]));
  let orderedIds = searchFilteredIds;
  if (sortOption === "name") {
    const withTitle = searchFilteredIds
      .map((id) => ({ id, title: (listingById[id]?.title ?? "").trim().toLowerCase() }))
      .sort((a, b) => a.title.localeCompare(b.title));
    orderedIds = withTitle.map((x) => x.id);
  } else {
    orderedIds = [...searchFilteredIds].sort((a, b) => {
      const A = itemOrder.get(a);
      const B = itemOrder.get(b);
      if (!A || !B) return 0;
      return A.createdAt > B.createdAt ? -1 : A.createdAt < B.createdAt ? 1 : A.index - B.index;
    });
  }

  const imageResult =
    orderedIds.length > 0
      ? await getFirstImageUrlPerListingIds(orderedIds)
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

  const entityTypeById = Object.fromEntries(items.map((i) => [i.entity_id, i.entity_type]));
  const displayList = orderedIds.map((id) => listingById[id]).filter(Boolean) as ListingSummary[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/me/saved"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Back to Boards
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          {folder.name}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {folder.item_count} item{folder.item_count !== 1 ? "s" : ""}
        </p>
      </div>

      <BoardDetailFilters
        currentFilter={filterTab}
        currentSort={sortOption}
        currentSearch={searchQuery}
        folderId={folderId}
        basePath={`/me/saved/folder/${folderId}`}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load items. Please try again.
        </p>
      )}

      {displayList.length === 0 && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {searchQuery.trim()
            ? "No items match your search."
            : filterTab !== "all"
              ? `No ${filterTab} in this board.`
              : "No items in this board yet. Save projects or products from the lightbox to add them here."}
        </p>
      )}

      {displayList.length > 0 && (
        <ul
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Board items"
        >
          {displayList.map((listing) => {
            const ownerId = (listing as ListingSummary & { owner_clerk_user_id?: string | null }).owner_clerk_user_id;
            const ownerProfile = ownerId ? ownerMap[ownerId] : null;
            const displayName = ownerProfile?.display_name ?? ownerProfile?.username ?? null;
            const type = entityTypeById[listing.id] ?? listing.type;

            return (
              <li key={listing.id} className="flex flex-col">
                {type === "project" ? (
                  <ProjectCard
                    listing={listing}
                    imageUrl={imageMap[listing.id]}
                    postedBy={displayName}
                  />
                ) : (
                  <ProductCard
                    listing={listing}
                    imageUrl={imageMap[listing.id]}
                    postedBy={displayName}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
