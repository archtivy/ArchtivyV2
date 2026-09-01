"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileActionForm } from "@/app/actions/profile";
import type { Profile } from "@/lib/types/profiles";

/**
 * Edit mode for the profile page — a light layer, not a second interface.
 *
 * ── WHY A CONTEXT AND NOT A FORM ────────────────────────────────────────────
 * The fields being edited are scattered across the page in the places they are
 * published: the name and location live in the rail, the intro under the cover,
 * About inside its own view, the links in CONNECT. There is no single container
 * to hang a <form> on, and wrapping the whole page in one would put a form
 * around the project grid and the view navigator.
 *
 * So the draft lives here and each field is a small client component that reads
 * and writes one key. ProfilePageView and ProfileRail stay server components and
 * render the same markup they always did; the editable spots are swapped for
 * components that render THAT SAME MARKUP when edit mode is off.
 *
 * ── NOTHING ABOUT THE BACKEND CHANGED ───────────────────────────────────────
 * Save builds the same complete FormData the drawer built and calls the same
 * updateProfileActionForm, which still re-resolves the row by id and checks
 * ownsProfile() against the Clerk session before writing. The hidden-field
 * preservation is still here too, for the same reason: the action writes a
 * COMPLETE ProfileUpdateInput, so any key omitted from the submission is
 * written as null. See buildFormData below.
 */

export interface ProfileDraft {
  display_name: string;
  /** Full About content. */
  bio: string;
  /** Short intro under the cover. Independent of `bio` — see ProfileIntro. */
  short_bio: string;
  /** "" means "no owner-set cover", which falls back to the derived one. */
  cover_image_url: string;
  website: string;
  instagram: string;
  linkedin: string;
  behance: string;
  twitter_url: string;
  pinterest_url: string;
  location_place_name: string;
  location_city: string;
  location_country: string;
  location_lat: string;
  location_lng: string;
  location_mapbox_id: string;
}

interface Ctx {
  /** False for every non-owner: the provider is not even mounted for them. */
  editing: boolean;
  draft: ProfileDraft;
  setField: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
  setLocation: (v: Partial<ProfileDraft>) => void;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  begin: () => void;
  cancel: () => void;
  save: () => void;
}

const ProfileEditCtx = createContext<Ctx | null>(null);

/** Null outside edit mode's provider — i.e. for every non-owner. */
export function useProfileEdit(): Ctx | null {
  return useContext(ProfileEditCtx);
}

function draftOf(p: Profile): ProfileDraft {
  return {
    display_name: p.display_name ?? "",
    bio: p.bio ?? "",
    short_bio: p.short_bio ?? "",
    cover_image_url: p.cover_image_url ?? "",
    website: p.website ?? "",
    instagram: p.instagram ?? "",
    linkedin: p.linkedin ?? "",
    behance: p.behance ?? "",
    twitter_url: p.twitter_url ?? "",
    pinterest_url: p.pinterest_url ?? "",
    location_place_name:
      p.location_place_name ?? [p.location_city, p.location_country].filter(Boolean).join(", "),
    location_city: p.location_city ?? "",
    location_country: p.location_country ?? "",
    location_lat: p.location_lat != null ? String(p.location_lat) : "",
    location_lng: p.location_lng != null ? String(p.location_lng) : "",
    location_mapbox_id: p.location_mapbox_id ?? "",
  };
}

/**
 * The submission, built by hand so it stays COMPLETE.
 *
 * updateProfileAction reads every one of these keys and writes the result; a
 * key that is absent is written as null. Omitting the six "preserved" fields
 * below would therefore wipe the owner's discipline, brand type, reader type,
 * location visibility and both show_* flags on every save. They are carried at
 * their current values rather than made partial in the action, because the
 * action is shared and changing its write semantics changes what "update"
 * means for its other callers.
 */
function buildFormData(profile: Profile, draft: ProfileDraft): FormData {
  const fd = new FormData();
  fd.set("_profileId", profile.id);
  fd.set("username", profile.username ?? "");

  // Preserved, not edited.
  fd.set(
    "location_visibility",
    (profile as { location_visibility?: string }).location_visibility ?? "public"
  );
  fd.set("designer_discipline", profile.designer_discipline ?? "");
  fd.set("brand_type", profile.brand_type ?? "");
  fd.set("reader_type", profile.reader_type ?? "");
  fd.set("show_designer_discipline", profile.show_designer_discipline !== false ? "true" : "false");
  fd.set("show_brand_type", profile.show_brand_type !== false ? "true" : "false");

  // Edited.
  for (const [k, v] of Object.entries(draft)) fd.set(k, v);
  return fd;
}

export function ProfileEditProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const initial = useMemo(() => draftOf(profile), [profile]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // A save re-renders the server components with new values, which produces a
  // new `initial`. Re-baselining here is what makes Save go back to disabled
  // after a successful save instead of staying lit against stale originals.
  useEffect(() => setDraft(initial), [initial]);

  /* ?edit=1 opens edit mode — how /me/profile reaches this editor. Read from
     window rather than the page's searchParams: /u/[username] declares
     `revalidate = 3600`, and taking searchParams server-side would opt the
     public profile out of that cache for every visitor to serve one owner. */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("edit") !== "1") return;
    setEditing(true);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(
    () => (Object.keys(initial) as (keyof ProfileDraft)[]).some((k) => draft[k] !== initial[k]),
    [draft, initial]
  );

  const setField = useCallback(
    <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    []
  );

  const setLocation = useCallback(
    (v: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...v })),
    []
  );

  const begin = useCallback(() => {
    setError(null);
    setEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setDraft(initial);
    setError(null);
    setEditing(false);
  }, [initial]);

  const save = useCallback(() => {
    setSaving(true);
    setError(null);
    (async () => {
      const result = await updateProfileActionForm(
        null as never,
        buildFormData(profile, draft)
      );
      setSaving(false);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setToast("Profile updated");
      // Re-renders the server components in place: the rail, the intro and
      // CONNECT all update without a reload and without losing scroll.
      router.refresh();
    })();
  }, [profile, draft, router]);

  const value = useMemo<Ctx>(
    () => ({ editing, draft, setField, setLocation, dirty, saving, error, begin, cancel, save }),
    [editing, draft, setField, setLocation, dirty, saving, error, begin, cancel, save]
  );

  return (
    <ProfileEditCtx.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 font-body text-[13px] text-cream shadow-lg"
        >
          {toast}
        </div>
      )}
    </ProfileEditCtx.Provider>
  );
}
