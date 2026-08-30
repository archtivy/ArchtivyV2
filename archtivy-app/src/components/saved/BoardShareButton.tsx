"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import { BoardShareModal } from "@/app/(app)/me/saved/BoardShareModal";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";
import type { FolderWithMeta } from "@/lib/savedFoldersConstants";

/**
 * Share a board — the existing modal, kept reachable.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Board sharing is a real, working feature: setBoardVisibility mints a
 * share_slug, /saved/boards/[slug] renders it publicly, and one board on the
 * platform is already public. Its ONLY entry point was a per-board button in
 * SavedBoardsSection, the component the new workspace replaces — so rebuilding
 * the page without this would have quietly deleted the feature from the UI
 * while leaving its backend, its public route and its live data in place.
 *
 * Nothing about sharing is reimplemented here. This is the same BoardShareModal
 * over the same server action; only the button that opens it is new, and it
 * sits beside the board title where the board itself is what you are sharing.
 */
export function BoardShareButton({ folder }: { folder: FolderWithMeta }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN_PILL_SECONDARY}>
        <Share2 strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        Share
      </button>
      {open && (
        <BoardShareModal
          folder={folder}
          onClose={() => setOpen(false)}
          onVisibilityChange={() => router.refresh()}
        />
      )}
    </>
  );
}
