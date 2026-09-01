"use client";

import { ProfileStatement } from "@/components/profile/ProfileViews";
import { EditableText } from "./EditableText";
import { useProfileEdit } from "./ProfileEditContext";

/**
 * The introduction under the cover.
 *
 * ── TWO FIELDS NOW, WITH A FALLBACK ─────────────────────────────────────────
 * `short_bio` is the intro; `bio` is About. They are independent drafts, so
 * editing one does not touch the other.
 *
 * `short_bio ?? bio` is what keeps every existing profile looking identical:
 * none of the 200 live rows has a short_bio, and the migration deliberately did
 * NOT copy bio across, so this band still shows the first three lines of About
 * until an owner writes a real intro. The moment they do, short_bio takes over
 * and About stops following it.
 *
 * In edit mode the pencil always edits short_bio — never the fallback value —
 * so a first edit starts from the borrowed text rather than silently rewriting
 * About. The clamp lifts only while the textarea is open.
 */
export function ProfileIntro({
  shortBio,
  bio,
  isOwner,
}: {
  shortBio: string | null;
  bio: string | null;
  isOwner: boolean;
}) {
  const ctx = useProfileEdit();
  const editing = Boolean(ctx?.editing);
  const shown = shortBio?.trim() || bio;

  // Publicly unchanged: nothing to show, no band. In edit mode it appears even
  // when empty so a profile with no introduction has somewhere to write one.
  if (!shown && !(isOwner && editing)) return null;

  return (
    <ProfileStatement>
      <div className="mt-7 max-w-[68ch]">
        <EditableText
          field="short_bio"
          multiline
          rows={4}
          maxLength={300}
          /* Seeded from `bio` when short_bio is still empty, so the owner edits
             the sentence they can see rather than an empty box. */
          seed={shortBio?.trim() ? undefined : bio ?? undefined}
          inputClassName="font-body text-[17px] leading-[30px] text-ink"
          /* The band is three lines publicly and must stay three lines in edit
             mode — SHL's bio runs 25, and dropping the clamp turned a tidy
             statement into a wall of text the moment the owner clicked Edit.
             The clamp lifts only while the textarea is open. */
          displayClassName="line-clamp-3"
          placeholder="Introduce your studio in a sentence or two."
        >
          <p className="line-clamp-3 font-body text-[17px] leading-[30px] text-ink">{shown}</p>
        </EditableText>
      </div>
    </ProfileStatement>
  );
}
