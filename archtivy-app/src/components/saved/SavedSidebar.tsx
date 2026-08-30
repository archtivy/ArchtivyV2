"use client";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, Building2, Package } from "lucide-react";
import { NewBoardButton } from "@/components/saved/NewBoardButton";
import { savedHref, type SavedParams, type SavedType } from "@/lib/saved/params";
import type { SavedBoard } from "@/lib/db/savedLibrary";

/**
 * The Saved workspace rail: library navigation, then boards.
 *
 * ── WHAT THE REFERENCE HAS THAT THIS DOES NOT ───────────────────────────────
 * The Files mockup's rail carries All Files / Recently added / Collections /
 * Trash, then a tall file-type checkbox group (PDF, CAD, Image, Other), then
 * Source / Brand / Designer / Project / Download date accordions. Almost none
 * of that has a counterpart here and none of it is copied:
 *
 *   PDF / CAD / Image   saves are listings, not documents
 *   Trash               no soft-delete on folder_items; unsaving is a DELETE
 *   Recently added      the default sort already is newest-first
 *   Designers / Brands  NOT SAVEABLE. entity_type is "project" | "product"
 *                       everywhere in savedFolders.ts and no profile surface
 *                       renders a save control, so those two rows would be
 *                       permanently dead. Omitted rather than shown at zero.
 *
 * ── AND NO SECOND TYPE FILTER ───────────────────────────────────────────────
 * The reference repeats file type as both nav and a checkbox group. Type is
 * this rail's primary navigation, so there is no giant checkbox section
 * underneath saying the same thing twice. Boards are the only other axis, and
 * they are navigation too. That leaves the rail shorter than the Files one,
 * which is the right outcome rather than a missing one.
 */

const TYPE_ROWS: { value: SavedType; label: string; Icon: typeof Bookmark }[] = [
  { value: "all", label: "All Saved", Icon: Bookmark },
  { value: "project", label: "Projects", Icon: Building2 },
  { value: "product", label: "Products", Icon: Package },
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
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-[14px] transition-colors",
        // The reference's selected state is a soft neutral fill, not an accent
        // bar and not a brand colour.
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
}: {
  params: SavedParams;
  boards: SavedBoard[];
  counts: { all: number; project: number; product: number };
}) {
  return (
    <nav aria-label="Saved library" className="flex flex-col gap-8">
      <div>
        <p className="mb-2 px-3 font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Saved
        </p>
        <ul className="space-y-0.5">
          {TYPE_ROWS.map(({ value, label, Icon }) => {
            // Type is a filter WITHIN the current board, not a jump back to the
            // whole library — switching to Products inside "LA" keeps you in LA.
            const active = params.type === value;
            return (
              <li key={value}>
                <RowShell href={savedHref({ ...params, type: value })} active={active}>
                  <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  <span className="shrink-0 font-body text-[13px] text-muted">
                    {counts[value === "all" ? "all" : value]}
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
          {/*
           * "Boards", not "Collections".
           *
           * The mockup says Collections, but `collections` is already a live,
           * unrelated feature — the cron-refreshed, publicly indexable
           * Inspiration collections. Two different things under one word in one
           * product is worse than not matching the mockup's copy, and every
           * existing surface already says board: SaveToBoardPopover,
           * BoardPickerPanel, BoardShareModal, "Save to board".
           */}
        </div>

        <div className="px-3 pb-2">
          <NewBoardButton />
        </div>

        {boards.length > 0 ? (
          <ul className="space-y-0.5">
            <li>
              <RowShell
                href={savedHref({ ...params, board: null })}
                active={params.board === null}
              >
                <span className="h-7 w-7 shrink-0 rounded-md bg-stone" aria-hidden />
                <span className="min-w-0 flex-1 truncate">All boards</span>
                <span className="shrink-0 font-body text-[13px] text-muted">{boards.length}</span>
              </RowShell>
            </li>
            {boards.map((b) => (
              <li key={b.id}>
                <RowShell
                  href={savedHref({ ...params, board: b.id })}
                  active={params.board === b.id}
                >
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-stone">
                    {b.coverUrl && (
                      <Image src={b.coverUrl} alt="" fill sizes="28px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span className="shrink-0 font-body text-[13px] text-muted">{b.itemCount}</span>
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
  );
}
