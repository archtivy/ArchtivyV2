"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Bookmark, Clock, LayoutGrid, Package } from "lucide-react";
import { NewBoardButton } from "@/components/saved/NewBoardButton";
import {
  savedHref,
  savedViewHref,
  isSavedView,
  type SavedParams,
  type SavedType,
  type SavedWindow,
} from "@/lib/saved/params";
import type { SavedBoard } from "@/lib/db/savedLibrary";

/**
 * The Saved workspace rail: who you are, then the library, then your boards.
 *
 * ── WHAT THE REFERENCE HAS THAT THIS DOES NOT ───────────────────────────────
 * The mockup's rail is All saved / Projects / Products / Recently added, then
 * COLLECTIONS. Three of those four map exactly. The fourth does not:
 *
 *   Collections   renamed to BOARDS, because `collections` is already a live,
 *                 unrelated feature — the cron-refreshed, publicly indexable
 *                 Inspiration collections. Two different things under one word
 *                 in one product is worse than not matching a mockup's copy,
 *                 and every existing surface already says board:
 *                 SaveToBoardPopover, BoardPickerPanel, BoardShareModal.
 *
 *   Designers /   NOT SAVEABLE. entity_type is "project" | "product" across
 *   Brands        savedFolders.ts, and no profile surface renders a save
 *                 control, so those rows would be permanently dead. The mockup
 *                 does not show them either; noted because the earlier draft
 *                 of this brief asked about them.
 *
 * ── NO "VIEW ALL BOARDS" LINK ───────────────────────────────────────────────
 * The brief asks for one "if the existing route supports it". No boards index
 * route exists — /me/saved/folder/[folderId] is a single board, and it now
 * redirects into this workspace. Every board the user has is already listed
 * here in full and again in the preview rail, so the link would point at a
 * page showing the same three rows the reader is looking at. Omitted rather
 * than pointed at a placeholder.
 *
 * ── THE RAIL NAVIGATES; THE TOOLBAR FILTERS ─────────────────────────────────
 * These four rows are PLACES, so each resets the board and the date window
 * (savedViewHref). Otherwise "Projects" clicked from inside a board would
 * quietly stay in that board while the count beside it read library-wide — the
 * count/grid mismatch this page has already been burned by once. Narrowing
 * within a view is what the toolbar's Type / Board / Date saved pills are for.
 */

const VIEWS: {
  label: string;
  Icon: typeof Bookmark;
  view: { type?: SavedType; window?: SavedWindow };
  countKey: "all" | "project" | "product" | "recent";
}[] = [
  { label: "All saved", Icon: Bookmark, view: {}, countKey: "all" },
  { label: "Projects", Icon: LayoutGrid, view: { type: "project" }, countKey: "project" },
  { label: "Products", Icon: Package, view: { type: "product" }, countKey: "product" },
  { label: "Recently added", Icon: Clock, view: { window: "recent" }, countKey: "recent" },
];

function RowShell({
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
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-[14px] transition-colors",
        // The reference's selected state: a soft neutral fill, a restrained
        // radius, a black icon and a stronger label. No accent, no left bar.
        active ? "bg-stone/70 font-medium text-ink" : "text-ink hover:bg-stone/40",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function SavedSidebar({
  params,
  boards,
  counts,
  profile,
}: {
  params: SavedParams;
  boards: SavedBoard[];
  counts: { all: number; project: number; product: number; recent: number };
  /** The signed-in user. Null only if their profile row is missing. */
  profile: { displayName: string; href: string | null; avatarUrl: string | null } | null;
}) {
  return (
    <div className="flex flex-col gap-7">
      {profile && (
        <div className="flex items-center gap-3 px-3">
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-ink text-cream">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              // Real initial from the real display name — not a stock face.
              <span className="flex h-full w-full items-center justify-center font-body text-[15px]">
                {profile.displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-body text-[14px] font-medium text-ink">
              {profile.displayName}
            </span>
            {profile.href && (
              <Link
                href={profile.href}
                className="mt-0.5 inline-flex items-center gap-1 font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                View profile
                <ArrowRight strokeWidth={1.5} className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </span>
        </div>
      )}

      <nav aria-label="Saved library" className="flex flex-col gap-7">
        <div>
          <p className="mb-2 px-3 font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Saved
          </p>
          <ul className="space-y-0.5">
            {VIEWS.map(({ label, Icon, view, countKey }) => {
              const active = isSavedView(params, view);
              return (
                <li key={label}>
                  <RowShell href={savedViewHref(params, view)} active={active}>
                    <Icon
                      strokeWidth={1.5}
                      className={`h-4 w-4 shrink-0 ${active ? "text-ink" : "text-muted"}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="shrink-0 font-body text-[13px] text-muted">
                      {counts[countKey]}
                    </span>
                  </RowShell>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-hairline pt-6">
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
              Boards
            </p>
            <NewBoardButton variant="inline" />
          </div>

          {boards.length > 0 ? (
            <ul className="space-y-0.5">
              {boards.map((b) => (
                <li key={b.id}>
                  <RowShell
                    href={savedHref({ ...params, board: b.id })}
                    active={params.board === b.id}
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-stone">
                      {b.coverUrl && (
                        <Image
                          src={b.coverUrl}
                          alt=""
                          fill
                          sizes="28px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <span className="shrink-0 font-body text-[13px] text-muted">
                      {b.itemCount}
                    </span>
                  </RowShell>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 font-body text-[13px] leading-[20px] text-muted">
              Boards group saved work by theme. Create one to start.
            </p>
          )}
        </div>
      </nav>
    </div>
  );
}
