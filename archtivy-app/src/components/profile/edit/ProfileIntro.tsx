"use client";

import { ProfileStatement } from "@/components/profile/ProfileViews";
import { EditableText } from "./EditableText";
import { useProfileEdit } from "./ProfileEditContext";

/**
 * The introduction under the cover — the same band, now editable in place.
 *
 * ── ONE FIELD, TWO RENDERS ──────────────────────────────────────────────────
 * `bio` is the only profile text column. This band is it clamped to three
 * lines; About is it unclamped. Editing either edits the same value, which is
 * why both spots write the SAME draft key rather than pretending to be two
 * fields that would overwrite each other.
 *
 * The clamp is dropped while a field is open, because you cannot edit the
 * fourth line of text you cannot see.
 */
export function ProfileIntro({ bio, isOwner }: { bio: string | null; isOwner: boolean }) {
  const ctx = useProfileEdit();
  const editing = Boolean(ctx?.editing);

  // Publicly unchanged: no bio, no band. In edit mode it appears even when
  // empty so a profile with no introduction has somewhere to write one.
  if (!bio && !(isOwner && editing)) return null;

  return (
    <ProfileStatement>
      <div className="mt-7 max-w-[68ch]">
        <EditableText
          field="bio"
          multiline
          rows={4}
          inputClassName="font-body text-[17px] leading-[30px] text-ink"
          /* The band is three lines publicly and must stay three lines in edit
             mode — SHL's bio runs 25, and dropping the clamp turned a tidy
             statement into a wall of text the moment the owner clicked Edit.
             The clamp lifts only while the textarea is open. */
          displayClassName="line-clamp-3"
          placeholder="Introduce your studio in a sentence or two."
        >
          <p className="line-clamp-3 font-body text-[17px] leading-[30px] text-ink">{bio}</p>
        </EditableText>
      </div>
    </ProfileStatement>
  );
}
