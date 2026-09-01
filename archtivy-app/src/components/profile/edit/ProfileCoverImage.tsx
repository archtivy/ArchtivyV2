"use client";

import Image from "next/image";
import { CoverEditControl } from "./CoverEditControl";
import { useProfileEdit } from "./ProfileEditContext";

/**
 * The cover band, with its three-step source and the owner's control.
 *
 * ── RENDERING PRIORITY ──────────────────────────────────────────────────────
 *   1. profiles.cover_image_url   the owner's own cover
 *   2. derived                    the first published listing's cover, which is
 *                                 what every profile used before this column
 *                                 existed and what 200 of 200 still use
 *   3. the flat stone band        no cover, no listing — unchanged
 *
 * Clearing the owner's cover therefore falls straight back to (2); there is no
 * "empty custom cover" state to get stuck in.
 *
 * In edit mode the DRAFT wins over the saved column, so choosing an image or
 * pressing Remove shows the result immediately — including the fall-back to the
 * derived cover — before anything is written.
 */
export function ProfileCoverImage({
  profileId,
  savedCover,
  derivedCover,
  isOwner,
}: {
  profileId: string;
  savedCover: string | null;
  derivedCover: string | null;
  isOwner: boolean;
}) {
  const ctx = useProfileEdit();
  const custom = ctx?.editing ? ctx.draft.cover_image_url || null : savedCover;
  const src = custom || derivedCover;

  return (
    <div className="relative aspect-[43/10] w-full overflow-hidden rounded-xl bg-stone">
      {src && (
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
          // Owner covers are uploaded to Supabase storage with a cache-busting
          // query string; the optimiser is skipped for them so a replaced cover
          // is not served from a stale optimised entry.
          unoptimized={Boolean(custom)}
        />
      )}
      {isOwner && <CoverEditControl profileId={profileId} />}
    </div>
  );
}
