import Link from "next/link";
import { notFound } from "next/navigation";
import { getBoardByShareSlug } from "@/app/actions/savedFolders";
import { Container } from "@/components/layout/Container";
import type { FolderItemWithCreated } from "@/app/actions/savedFolders";
import { getListingsByIds } from "@/lib/db/listings";
import { getFirstImageUrlPerListingIds } from "@/lib/db/listingImages";
import { getProfilesByClerkIds } from "@/lib/db/profiles";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { BoardDetailFilters } from "@/app/(app)/me/saved/folder/[folderId]/BoardDetailFilters";
import type { ListingSummary } from "@/lib/types/listings";
import type { Profile } from "@/lib/types/profiles";

type FilterTab = "all" | "projects" | "products";
type SortOption = "recent" | "name";

export default async function PublicBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string; sort?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { filter = "all", sort = "recent", q: searchQuery = "" } = await searchParams;
  const filterTab = (filter === "projects" || filter === "products" ? filter : "all") as FilterTab;
  const sortOption = (sort === "name" ? "name" : "recent") as SortOption;

  const result = await getBoardByShareSlug(slug);
  if (result.ok !== true) notFound();
  const data = result.data;
  if (data == null) {
    return (
      <Container className="py-12">
        <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">This board is private.</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          The owner has not made this board public. You need to be signed in as the owner to view it.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-[#002abf] hover:underline"
        >
          Go to home
        </Link>
        </div>
      </Container>
    );
  }

  const { folder, items } = data;

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
  const basePath = `/saved/boards/${slug}`;

  return (
    <Container className="space-y-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          {folder.name}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {folder.item_count} item{folder.item_count !== 1 ? "s" : ""} · Shared board
        </p>
      </div>

      <BoardDetailFilters
        currentFilter={filterTab}
        currentSort={sortOption}
        currentSearch={searchQuery}
        folderId={folder.id}
        basePath={basePath}
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
              : "This board has no items yet."}
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
    </Container>
  );
}
