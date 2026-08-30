import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HomeNav } from "@/components/home/HomeNav";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";
import { SavedSidebar } from "@/components/saved/SavedSidebar";
import { SavedMobileNav } from "@/components/saved/SavedMobileNav";
import { SavedBoardsRow } from "@/components/saved/SavedBoardsRow";
import { SavedControls } from "@/components/saved/SavedControls";
import { SavedGrid } from "@/components/saved/SavedGrid";
import { getSavedLibrary } from "@/lib/db/savedLibrary";
import {
  parseSavedParams,
  savedHref,
  hasActiveFilters,
  WINDOW_DAYS,
  DEFAULT_SAVED_PARAMS,
  type SavedParams,
} from "@/lib/saved/params";
import { BoardShareButton } from "@/components/saved/BoardShareButton";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";

export const metadata: Metadata = {
  title: "Saved | Archtivy",
  robots: { index: false, follow: false },
};

/** A personal library is never cached — a save must show up on the next load. */
export const dynamic = "force-dynamic";

/**
 * /me/saved — the saved workspace.
 *
 * ── THE MOCKUP'S LAYOUT, THIS PLATFORM'S DATA ───────────────────────────────
 * Composition follows the approved reference closely: a 280px persistent rail
 * with a profile block on top, a hairline divider, a wide neutral main column,
 * the heading with its count pill, the boards preview row, a compact toolbar,
 * then a dense grid. What the reference's CONTENT implies is another matter —
 * every label and every number here comes from the live schema:
 *
 *   Collections -> BOARDS   `collections` is the unrelated public Inspiration
 *                           system. Renaming Saved's folders to match a mockup
 *                           would put two different features under one word.
 *   248 / 120 / 96 / 28     mock counts. The real library resolves to 6.
 *   File type / Source /    document facets. A save records entity_type, its
 *   Brand / Project         boards and a timestamp, and nothing else.
 *   PROJECT / PRODUCT       not part of ListingCardShared. Adding them here
 *   image labels            would fork the canonical card for one surface.
 *   Grid / List toggle      only the grid exists; see SavedControls.
 *   Designer saving         entity_type is "project" | "product" only.
 *
 * ── FILTERING RUNS ON THE SERVER ────────────────────────────────────────────
 * q, type, window, board and sort are read from the URL here and applied before
 * render, so the first paint is already the filtered library and back/forward
 * restore it exactly. The client components own input handling only; none of
 * them holds a second copy of the result set.
 *
 * ── PAGINATION IS ABSENT ON PURPOSE ─────────────────────────────────────────
 * The reference shows "1 2 3 … 7". The largest library on the platform is 6
 * items and the biggest board is 3, so paging controls would render a single
 * dead page number on every account. When libraries outgrow a screenful, the
 * load-more the directories already use is the pattern to adopt.
 */
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/saved");

  const params = parseSavedParams(await searchParams);
  const [library, profileResult] = await Promise.all([
    getSavedLibrary(userId),
    getDefaultProfileForClerkUserId(userId),
  ]);

  const p = profileResult.data;
  const profile = p
    ? {
        displayName: p.display_name?.trim() || p.username || "Your profile",
        href: p.username ? `/u/${encodeURIComponent(p.username)}` : null,
        avatarUrl: p.avatar_url?.trim() || null,
      }
    : null;

  const board = params.board
    ? library.boards.find((b) => b.id === params.board) ?? null
    : null;
  // A board id that is not this user's simply falls back to the whole library
  // rather than 404ing the workspace.
  const activeBoardId = board?.id ?? null;

  let items = library.items;
  if (activeBoardId) items = items.filter((i) => i.boardIds.includes(activeBoardId));
  if (params.type !== "all") items = items.filter((i) => i.entityType === params.type);

  const days = WINDOW_DAYS[params.window];
  if (days) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    items = items.filter((i) => i.savedAt >= cutoff);
  }

  if (params.q) {
    // Searches the LIBRARY, never the catalogue: only fields already on the
    // card model, and only within what this user has saved.
    const needle = params.q.toLowerCase();
    items = items.filter((i) => {
      const m = i.model;
      return [m.title, m.authorName, m.brandName, m.categoryLabel, m.metaLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }

  items = [...items].sort((a, b) => {
    if (params.sort === "title") return a.model.title.localeCompare(b.model.title);
    if (params.sort === "oldest") return a.savedAt.localeCompare(b.savedAt);
    return b.savedAt.localeCompare(a.savedAt);
  });

  /*
   * Rail counts are WHOLE-LIBRARY, always.
   *
   * The rail is navigation — each of its four rows resets the board — so a
   * count beside "Projects" describes where that row takes you. Scoping them to
   * the open board instead would print "Projects 3" next to a link that leads
   * to a view of all of them, which is the count/grid mismatch this page has
   * already been burned by once (a board once read "LA 5" over three cards).
   * A board's own count sits on its own row, where it belongs.
   */
  const counts = library.counts;

  /*
   * The heading names the VIEW you are in, and the pill counts what is on
   * screen under it.
   *
   * Both halves matter. Naming only the library meant clicking "Projects" in
   * the rail highlighted that row, filtered the grid to three cards, and left
   * the heading reading "All saved · 6 items" above them — a title and a number
   * that described neither the row you clicked nor the grid you got. And
   * counting the view's total rather than the rendered rows would put "3 items"
   * over a two-card search result. Counting `items` is the only figure that
   * cannot drift from the grid, because it IS the grid.
   */
  const title = board
    ? board.name
    : params.type === "project" && params.window === "all"
      ? "Projects"
      : params.type === "product" && params.window === "all"
        ? "Products"
        : params.window === "recent" && params.type === "all"
          ? "Recently added"
          : "All saved";
  const total = items.length;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* The canonical header, the same one every current public and /me page
          renders — not the header drawn in the mockup. */}
      <HomeNav variant="solid" />

      <div className="mx-auto flex w-full max-w-[1600px] gap-10 px-4 pb-24 pt-[92px] sm:px-6 lg:px-8">
        {/* ~280px, per the reference. The hairline is the divider between the
            two columns; the workspace is full-width, never a centred container. */}
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-[92px] border-r border-hairline pr-6">
            <SavedSidebar
              params={params}
              boards={library.boards}
              counts={counts}
              profile={profile}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[30px] leading-[38px] tracking-[-0.01em] text-ink">
                {title}
              </h1>
              <span className="rounded-full bg-stone/70 px-3 py-1 font-body text-[13px] text-ink">
                {total} item{total === 1 ? "" : "s"}
              </span>
              <span className="ml-auto flex items-center gap-2">
                {/* Sharing lives beside the board it changes, and nowhere else
                    — see SavedBoardsRow on why the preview tiles only DISPLAY
                    public state rather than offering the control. */}
                {board && (
                  <BoardShareButton
                    folder={{
                      id: board.id,
                      name: board.name,
                      sort_order: board.sortOrder,
                      item_count: board.itemCount,
                      cover_image_url: board.coverUrl,
                      updated_at: null,
                      is_public: board.isPublic,
                      share_slug: board.shareSlug,
                    }}
                  />
                )}
                <SavedMobileNav
                  params={params}
                  boards={library.boards}
                  counts={counts}
                  profile={profile}
                />
              </span>
            </div>
            <p className="mt-3 max-w-[62ch] font-body text-[14px] leading-[22px] text-muted">
              {board
                ? "Projects and products you've saved to this board."
                : title === "Projects"
                  ? "Projects you've saved across Archtivy."
                  : title === "Products"
                    ? "Products you've saved across Archtivy."
                    : title === "Recently added"
                      ? "Saved in the last 30 days."
                      : "Everything you've saved from projects and products."}
            </p>
          </header>

          {library.setupRequired ? (
            <p className="font-body text-[14px] text-muted">
              Saved boards aren&rsquo;t set up on this environment yet.
            </p>
          ) : (
            <>
              {/* Boards preview, then the toolbar, then the grid — the
                  reference's order. There is deliberately no second "Recently
                  added" carousel above the grid: that view is a rail
                  destination, not a duplicate strip. */}
              {library.boards.length > 0 && (
                <SavedBoardsRow boards={library.boards} params={params} />
              )}

              <SavedControls params={params} boards={library.boards} />

              <div className="mt-8">
                {items.length > 0 ? (
                  <SavedGrid items={items} />
                ) : (
                  <SavedEmpty
                    params={params}
                    boardName={board?.name ?? null}
                    libraryEmpty={library.items.length === 0}
                    boardEmpty={Boolean(activeBoardId) && (board?.itemCount ?? 0) === 0}
                  />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Four different nothings, told apart.
 *
 * An empty library, an empty board, a type with nothing in it and a search that
 * matched nothing are different situations and get different sentences — the
 * first needs somewhere to go, the last needs a way back. None of them renders
 * placeholder cards.
 */
function SavedEmpty({
  params,
  boardName,
  libraryEmpty,
  boardEmpty,
}: {
  params: SavedParams;
  boardName: string | null;
  libraryEmpty: boolean;
  boardEmpty: boolean;
}) {
  const cleared: SavedParams = { ...DEFAULT_SAVED_PARAMS, board: params.board };

  if (libraryEmpty) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-[15px] text-ink">You haven&rsquo;t saved anything yet.</p>
        <p className="mt-2 font-body text-[14px] text-muted">
          The bookmark on any project or product card adds it here.
        </p>
        <Link href="/projects" className={`${BTN_PILL_SECONDARY} mt-6`}>
          Browse projects
        </Link>
      </div>
    );
  }

  if (params.q) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-[15px] text-ink">
          Nothing in {boardName ? boardName : "your library"} matches &ldquo;{params.q}&rdquo;.
        </p>
        <Link
          href={savedHref({ ...params, q: "" })}
          scroll={false}
          className="mt-4 inline-block font-body text-[14px] text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear the search
        </Link>
      </div>
    );
  }

  if (boardEmpty) {
    return (
      <div className="py-16 text-center">
        <p className="font-body text-[15px] text-ink">{boardName} is empty.</p>
        <p className="mt-2 font-body text-[14px] text-muted">
          Save something to this board from any project or product.
        </p>
      </div>
    );
  }

  const noun =
    params.type === "project" ? "projects" : params.type === "product" ? "products" : "items";
  return (
    <div className="py-16 text-center">
      <p className="font-body text-[15px] text-ink">
        No saved {noun}
        {boardName ? ` in ${boardName}` : ""}
        {params.window !== "all" ? " in this period" : ""}.
      </p>
      {hasActiveFilters(params) && (
        <Link
          href={savedHref(cleared)}
          scroll={false}
          className="mt-4 inline-block font-body text-[14px] text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
