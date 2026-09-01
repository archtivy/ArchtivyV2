"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadProfileCoverAction } from "@/app/actions/profile";
import { useProfileEdit } from "./ProfileEditContext";

/**
 * The cover's owner control — a small chip in the corner, only in edit mode.
 *
 * ── UPLOAD NOW, PERSIST ON SAVE ─────────────────────────────────────────────
 * Choosing a file uploads it immediately (it has to: the action returns the URL
 * the draft needs) but only the DRAFT is changed. `cover_image_url` reaches the
 * profiles row through the normal Save, so an upload followed by Cancel leaves
 * the profile exactly as it was — the object is simply unreferenced and gets
 * overwritten by the next upload to the same fixed path.
 *
 * ── REMOVE MEANS "FALL BACK", NOT "DELETE" ──────────────────────────────────
 * Remove clears the draft value, so Save writes NULL and the cover reverts to
 * the derived first-published-listing image. The stored object is deliberately
 * not deleted: the draft is cancellable, and deleting on click would break the
 * cover of an owner who then cancels.
 */
export function CoverEditControl({ profileId }: { profileId: string }) {
  const ctx = useProfileEdit();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ctx?.editing) return null;

  const hasCustom = Boolean(ctx.draft.cover_image_url);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset immediately so picking the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("_profileId", profileId);
    fd.set("file", file);
    const result = await uploadProfileCoverAction(fd);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    ctx.setField("cover_image_url", result.url);
  };

  const chip =
    "inline-flex h-7 items-center gap-1.5 rounded-full border border-white/25 bg-ink/55 px-2.5 font-body text-[12px] text-cream backdrop-blur-sm transition-colors hover:bg-ink/75 disabled:opacity-60";

  return (
    <>
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={chip}>
          {busy ? (
            <Loader2 strokeWidth={1.5} className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          )}
          {busy ? "Uploading…" : "Change cover"}
        </button>
        {/* Only offered when there is an owner-set cover to remove. The derived
            listing cover is not the owner's to delete from here. */}
        {hasCustom && !busy && (
          <button
            type="button"
            onClick={() => ctx.setField("cover_image_url", "")}
            className={chip}
            aria-label="Remove cover"
          >
            <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
            Remove
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onPick}
          className="hidden"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="absolute left-3 top-3 z-10 rounded bg-ink/75 px-2 py-1 font-body text-[12px] text-cream"
        >
          {error}
        </p>
      )}
    </>
  );
}
