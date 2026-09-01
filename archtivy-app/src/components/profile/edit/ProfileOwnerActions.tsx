"use client";

import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Camera, Link2, Pencil } from "lucide-react";
import { ProfileLocationPicker, type ProfileLocationValue } from "@/components/location/ProfileLocationPicker";
import { useProfileEdit } from "./ProfileEditContext";
import { AnchoredPopover } from "./AnchoredPopover";

/**
 * The owner's mode switch, in the slot Follow/Message occupy for everyone else.
 *
 * "Edit profile" becomes "Cancel · Save changes" in the same place at the same
 * size, so entering edit mode does not move anything on the page. No toolbar,
 * no sticky bar — the actions stay where the control that opened them was.
 */
export function ProfileOwnerActions() {
  const ctx = useProfileEdit();
  if (!ctx) return null;

  if (!ctx.editing) {
    return (
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={ctx.begin}
          className="inline-flex items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={ctx.cancel}
          disabled={ctx.saving}
          className="h-8 rounded-full border border-ink/25 px-3.5 font-body text-[13px] text-ink transition-colors hover:bg-stone/40 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={ctx.save}
          disabled={!ctx.dirty || ctx.saving}
          className="h-8 rounded-full bg-ink px-3.5 font-body text-[13px] text-cream transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ctx.saving ? "Saving…" : "Save changes"}
        </button>
      </div>
      {ctx.error && (
        <p role="alert" className="mt-2 text-center font-body text-[12px] text-red-600">
          {ctx.error}
        </p>
      )}
    </div>
  );
}

/**
 * The camera chip on the avatar. Present only in edit mode.
 *
 * avatar_url is synced from the Clerk account, so this opens Clerk's own
 * profile modal — the existing image-editing behaviour, unchanged. The
 * `avatars` bucket and uploadAvatar/deleteAvatar exist but stay unwired: two
 * writers for one column is a conflict, not a feature.
 */
export function AvatarEditBadge() {
  const ctx = useProfileEdit();
  const { openUserProfile } = useClerk();
  if (!ctx?.editing) return null;

  return (
    <button
      type="button"
      onClick={() => openUserProfile?.()}
      aria-label="Change profile photo"
      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-cream text-ink shadow-sm transition-colors hover:bg-stone/50"
    >
      <Camera strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/**
 * Location, edited in a small popover anchored under the published line.
 *
 * A popover rather than an inline input because the field is not free text:
 * ProfileLocationPicker writes seven columns from one Mapbox selection, and
 * free-typing is explicitly not accepted. It needs its suggestion list, which
 * will not fit inside a 13px metadata line.
 */
export function EditableLocation({ children }: { children: React.ReactNode }) {
  const ctx = useProfileEdit();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ctx?.editing) setOpen(false);
  }, [ctx?.editing]);

  if (!ctx || !ctx.editing) return <>{children}</>;

  const value: ProfileLocationValue | null = ctx.draft.location_place_name
    ? {
        place_name: ctx.draft.location_place_name,
        city: ctx.draft.location_city || null,
        country: ctx.draft.location_country || null,
        lat: Number(ctx.draft.location_lat) || 0,
        lng: Number(ctx.draft.location_lng) || 0,
        mapbox_id: ctx.draft.location_mapbox_id,
      }
    : null;

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span className="min-w-0">{children}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Edit location"
        aria-expanded={open}
        className="shrink-0 rounded p-0.5 text-muted opacity-60 transition-opacity hover:text-ink hover:opacity-100"
      >
        <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </button>

      <AnchoredPopover
        open={open}
        anchorRef={triggerRef}
        onClose={() => setOpen(false)}
        width={260}
        align="center"
      >
          <ProfileLocationPicker
            value={value}
            label="Location"
            placeholder="Search for a city…"
            onChange={(v) =>
              ctx.setLocation({
                location_place_name: v.place_name,
                location_city: v.city ?? "",
                location_country: v.country ?? "",
                location_lat: String(v.lat),
                location_lng: String(v.lng),
                location_mapbox_id: v.mapbox_id,
              })
            }
          />
      </AnchoredPopover>
    </span>
  );
}

/**
 * "Edit links" beside the CONNECT heading, opening a compact popover.
 *
 * The one place a popover-with-fields is right: several URLs belong to one
 * logical section, and editing them one pencil at a time would mean four
 * separate inline inputs in a list that renders only the populated ones.
 *
 * All six the schema holds. X/Twitter and Pinterest joined the other four in
 * migration 20260831100000; each renders publicly only when it has a value, so
 * the two new ones cost nothing on the 200 profiles that have neither.
 */
const LINK_FIELDS = [
  { key: "website", label: "Website", placeholder: "https://" },
  { key: "instagram", label: "Instagram", placeholder: "@handle" },
  { key: "linkedin", label: "LinkedIn", placeholder: "URL or handle" },
  { key: "behance", label: "Behance", placeholder: "URL or handle" },
  { key: "twitter_url", label: "X / Twitter", placeholder: "URL or @handle" },
  { key: "pinterest_url", label: "Pinterest", placeholder: "URL or handle" },
] as const;

export function EditLinksControl() {
  const ctx = useProfileEdit();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ctx?.editing) setOpen(false);
  }, [ctx?.editing]);

  if (!ctx?.editing) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 font-body text-[11px] normal-case tracking-normal text-muted transition-colors hover:text-ink"
      >
        <Link2 strokeWidth={1.5} className="h-3 w-3" aria-hidden />
        Edit links
      </button>

      <AnchoredPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={248}>
          {LINK_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="mb-2.5 block last:mb-0">
              <span className="mb-1 block font-body text-[11px] text-muted">{label}</span>
              <input
                type="text"
                value={ctx.draft[key]}
                placeholder={placeholder}
                onChange={(e) => ctx.setField(key, e.target.value)}
                className="w-full rounded-md border border-hairline bg-white px-2 py-1.5 font-body text-[12px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none"
              />
            </label>
          ))}
          <p className="mt-2.5 font-body text-[11px] leading-[15px] text-muted">
            Each link appears under Connect once it has a value.
          </p>
      </AnchoredPopover>
    </div>
  );
}

/**
 * The CONNECT block's visibility.
 *
 * Publicly it is exactly as before: no populated links, no section. In edit
 * mode it renders even at zero links, because otherwise the owner of a profile
 * with no links has no "Edit links" control to click — the section that would
 * carry it does not exist yet.
 *
 * The wrapper classes are RailSectionBlock's, kept identical so the block sits
 * on the same hairline and padding as every other section of the rail.
 */
export function ConnectBlock({
  hasLinks,
  children,
}: {
  hasLinks: boolean;
  children: React.ReactNode;
}) {
  const ctx = useProfileEdit();
  if (!hasLinks && !ctx?.editing) return null;
  return <div className="border-t border-hairline px-5 py-5">{children}</div>;
}
