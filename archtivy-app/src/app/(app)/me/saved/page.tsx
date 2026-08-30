import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { HomeNav } from "@/components/home/HomeNav";
import { SavedSidebar } from "@/components/saved/SavedSidebar";
import { SavedMobileNav } from "@/components/saved/SavedMobileNav";
import { SavedControls } from "@/components/saved/SavedControls";
import { SavedGrid } from "@/components/saved/SavedGrid";
import { getSavedLibrary } from "@/lib/db/savedLibrary";
import { parseSavedParams, savedHref, hasActiveFilters } from "@/lib/saved/params";
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
 * ── SIBLING OF FILES, NOT A COPY OF IT ──────────────────────────────────────
 * Same shell language as the Files reference: a persistent left rail, a wide
 * neutral main column, one large search field, compact pill controls, hairline
 * dividers, no shadows and no accent colour. The CONTENT model is deliberately
 * different — Files is documents and belongs in a table; Saved is design work
 * and belongs in a grid of canonical cards. Nothing file-specific was carried
 * across: no PDF/CAD/Image filters, no Trash, no size or format columns.
 *
 * ── FILTERING RUNS ON THE SERVER ────────────────────────────────────────────
 * q, type, sort and board are read from the URL here and applied before render,
 * so the first paint is already the filtered library and back/forward restore
 * it exactly. The client components own input handling only; none of them holds
 * a second copy of the result set.
 *
 * ── PAGINATION IS ABSENT ON PURPOSE ─────────────────────────────────────────
 * The Files mockup shows "1 2 3 … 7". The largest library on the platform is 10
 * items and the biggest board is 5, so paging controls would render a single
 * dead page number on every account. The grid renders the whole library, which
 * at this scale is also the fastest thing to do. When libraries grow past a
 * screenful, the load-more the directories already use is the pattern to adopt.
 */
export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/saved");

  const params = parseSavedParams(await searchParams);
  const library = await getSavedLibrary(userId);

  const board = params.board
    ? library.boards.find((b) => b.id === params.board) ?? null
    : null;
  // A board id that is not this user's simply falls back to the whole library
  // rather than 404ing the workspace.
  const activeBoardId = board?.id ?? null;

  let items = library.items;
  if (activeBoardId) items = items.filter((i) => i.boardIds.includes(activeBoardId));
  if (params.type !== "all") items = items.filter((i) => i.entityType === params.type);

  if (params.q) {
    // Searches the LIBRARY, never the catalogue: only fields already on the
    // card model, and only within what this user has saved.
    const needle = params.q.toLowerCase();
    items = items.filter((i) => {
      const m = i.model;
      return [m.title, m.authorName, m.categoryLabel, m.metaLabel]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }

  items = [...items].sort((a, b) => {
    if (params.sort === "title") return a.model.title.localeCompare(b.model.title);
    if (params.sort === "oldest") return a.savedAt.localeCompare(b.savedAt);
    return b.savedAt.localeCompare(a.savedAt);
  });

  // Counts beside the rail reflect the BOARD you are in, so "Projects 3" inside
  // a board means three in that board — not three across the whole library.
  const scoped = activeBoardId
    ? library.items.filter((i) => i.boardIds.includes(activeBoardId))
    : library.items;
  const counts = {
    all: scoped.length,
    project: scoped.filter((i) => i.entityType === "project").length,
    product: scoped.filter((i) => i.entityType === "product").length,
  };

  const title = board ? board.name : "All Saved";
  const total = counts.all;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* The canonical header, the same one every current public and /me page
          renders — not the header drawn in the mockup. */}
      <HomeNav variant="solid" />

      <div className="mx-auto flex w-full max-w-[1600px] gap-10 px-4 pb-24 pt-[92px] sm:px-6 lg:px-8">
        <aside className="hidden w-[264px] shrink-0 lg:block">
          <div className="sticky top-[92px] border-r border-hairline pr-6">
            <SavedSidebar params={params} boards={library.boards} counts={counts} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[32px] leading-[40px] tracking-[-0.01em] text-ink">
                {title}
              </h1>
              {total > 0 && (
                <span className="rounded-full bg-stone/70 px-3 py-1 font-body text-[13px] text-ink">
                  {total} saved
                </span>
              )}
              <span className="ml-auto flex items-center gap-2">
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
                />
              </span>
            </div>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[24px] text-muted">
              {board
                ? "Projects and products you've saved to this board."
                : "Projects and products you've saved across Archtivy."}
            </p>
          </header>

          {library.setupRequired ? (
            <p className="font-body text-[14px] text-muted">
              Saved boards aren&rsquo;t set up on this environment yet.
            </p>
          ) : (
            <>
              <SavedControls params={params} boardName={board?.name ?? null} />
              <div className="mt-8">
                {items.length > 0 ? (
                  <SavedGrid items={items} />
                ) : (
                  <SavedEmpty
                    params={params}
                    boardName={board?.name ?? null}
                    libraryEmpty={library.items.length === 0}
                    boardEmpty={Boolean(activeBoardId) && scoped.length === 0}
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
  params: ReturnType<typeof parseSavedParams>;
  boardName: string | null;
  libraryEmpty: boolean;
  boardEmpty: boolean;
}) {
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

  const noun = params.type === "project" ? "projects" : "products";
  return (
    <div className="py-16 text-center">
      <p className="font-body text-[15px] text-ink">
        No saved {noun}
        {boardName ? ` in ${boardName}` : ""}.
      </p>
      {hasActiveFilters(params) && (
        <Link
          href={savedHref({ q: "", type: "all", sort: "newest", board: params.board })}
          scroll={false}
          className="mt-4 inline-block font-body text-[14px] text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
