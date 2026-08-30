"use client";

import Image from "next/image";
import Link from "next/link";
import { Globe, Layers } from "lucide-react";
import { HorizontalRail } from "@/components/entity/HorizontalRail";
import { NewBoardButton } from "@/components/saved/NewBoardButton";
import { savedHref, type SavedParams } from "@/lib/saved/params";
import type { SavedBoard } from "@/lib/db/savedLibrary";

/**
 * The boards preview row, directly under the heading.
 *
 * ── ONE ROW, ON THE SHARED RAIL ─────────────────────────────────────────────
 * HorizontalRail, not a sixth hand-rolled `flex overflow-x-auto`. It brings the
 * arrows, the scroll-snap, real keyboard order and the ResizeObserver that
 * hides the controls when everything fits — which on this account it does, so
 * three boards plus the creation tile render as a plain row with no chrome.
 * Page dots are deliberately off: they earn their place on the homepage rails
 * where there are pages to indicate, and here there is one.
 *
 * ── CARD WIDTH IS DERIVED, NOT COPIED ───────────────────────────────────────
 * The reference fits five previews plus a creation tile across the main column.
 * At 1600 the main column is 1216px, so with gap-4 that is
 * (1216 - 5*16) / 6 = 189px per tile — hence w-[188px], which lands within a
 * pixel of the mockup's own 187px. The 5/3 image is the mockup's proportion too
 * (187x114). Nothing is scaled to taste.
 *
 * ── SHARING IS SHOWN, NOT OFFERED ───────────────────────────────────────────
 * The brief warns against a share control on every preview tile. A board that
 * IS public still needs to say so, or the only way to discover that one of your
 * boards is on the public web is to open it. So a public board carries a small
 * "Shared" marker — read-only, reflecting the real is_public/share_slug state —
 * and the control that CHANGES it stays where the change belongs: beside the
 * board's own heading, on the board view, as BoardShareButton.
 */
export function SavedBoardsRow({
  boards,
  params,
}: {
  boards: SavedBoard[];
  params: SavedParams;
}) {
  return (
    <section aria-label="Boards" className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-[18px] leading-[24px] tracking-tight text-ink">
          Boards
        </h2>
        <span className="font-body text-[13px] text-muted">
          {boards.length} board{boards.length === 1 ? "" : "s"}
        </span>
        {/*
         * No "View all boards →".
         *
         * The reference puts one here. There is no boards index route to send
         * it to — /me/saved/folder/[folderId] is a single board and now
         * redirects into this workspace — and every board the user owns is
         * already in this row and listed again in the rail beside it. The link
         * would lead to the same boards the reader is looking at, so it is
         * omitted rather than wired to a placeholder.
         */}
      </div>

      <HorizontalRail ariaLabel="Your boards" gapClassName="gap-4">
        {boards.map((b) => (
          <li key={b.id} className="w-[188px] shrink-0 snap-start">
            <Link
              href={savedHref({ ...params, board: b.id })}
              scroll={false}
              className="group block overflow-hidden rounded-xl border border-hairline bg-cream transition-colors hover:border-ink/25"
            >
              <span className="relative block aspect-[5/3] w-full overflow-hidden bg-stone">
                {b.coverUrl ? (
                  <Image
                    src={b.coverUrl}
                    alt=""
                    fill
                    sizes="188px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted">
                    <Layers strokeWidth={1.25} className="h-5 w-5" aria-hidden />
                  </span>
                )}
                {b.isPublic && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-cream/90 px-2 py-1 font-body text-[11px] text-ink backdrop-blur-sm">
                    <Globe strokeWidth={1.5} className="h-3 w-3" aria-hidden />
                    Shared
                  </span>
                )}
              </span>
              <span className="block px-3 py-2.5">
                <span className="block truncate font-body text-[14px] text-ink">
                  {b.name}
                </span>
                <span className="mt-0.5 block font-body text-[12px] text-muted">
                  {b.itemCount} item{b.itemCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          </li>
        ))}

        {/* Same createFolder action as the rail's "+ New", in the tile shape
            the reference draws at the end of the row. */}
        <li className="w-[188px] shrink-0 snap-start">
          <NewBoardButton variant="card" />
        </li>
      </HorizontalRail>
    </section>
  );
}
