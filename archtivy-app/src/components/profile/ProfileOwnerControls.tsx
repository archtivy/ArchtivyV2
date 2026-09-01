"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import { Check, Pencil, X } from "lucide-react";
import { updateProfileActionForm, type ProfileActionResult } from "@/app/actions/profile";
import { ProfileLocationPicker, type ProfileLocationValue } from "@/components/location/ProfileLocationPicker";
import { initialsOf } from "@/components/home/EntityCard";
import type { Profile } from "@/lib/types/profiles";

/**
 * The owner's Edit Profile control, and the drawer behind it.
 *
 * ── WHY ONE COMPONENT ───────────────────────────────────────────────────────
 * The button and the drawer share one piece of state, and the rail that hosts
 * them is a server component. Keeping both here means no context provider and
 * no state lifted into the page — the rail renders <ProfileOwnerControls /> in
 * the slot where Follow/Message sit for everyone else, and nothing else on the
 * profile changes shape.
 *
 * ── THE BUTTON IS RENDERED ONLY FOR THE OWNER ───────────────────────────────
 * ...but that is a convenience, not the security boundary. updateProfileAction
 * re-resolves the profile BY ID server-side and checks ownsProfile() against
 * the Clerk session before it writes anything, so a hand-rolled POST from a
 * signed-in stranger is refused. See app/actions/profile.ts.
 *
 * ── WHY HIDDEN FIELDS FOR THINGS THE DRAWER DOES NOT EDIT ───────────────────
 * updateProfileAction builds a COMPLETE ProfileUpdateInput from formData: any
 * key absent from the submission is written as null, not left alone. Submitting
 * only the drawer's visible fields would therefore wipe designer_discipline,
 * brand_type, reader_type, location_visibility and the two show_* flags on
 * every save. They ride along as hidden inputs carrying their current values.
 * This is deliberately done HERE rather than by making the action partial —
 * the action is shared, and changing its write semantics would change what
 * every other caller means by "update".
 */
export function ProfileOwnerControls({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /*
   * ?edit=1 opens the drawer — that is how /me/profile, the account menu's
   * "Edit Profile" destination, now reaches this editor.
   *
   * Read from window on mount rather than with useSearchParams(), and NOT via
   * the page's searchParams: /u/[username] declares `revalidate = 3600`, and
   * taking searchParams into the server component would opt the whole public
   * profile out of that cache for every visitor, to serve one owner. Reading
   * it here costs nothing to anyone else.
   *
   * The param is then stripped from the URL so a refresh, a shared link or a
   * Back does not reopen the editor.
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("edit") !== "1") return;
    setOpen(true);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          Edit profile
        </button>
      </div>

      {open && (
        <ProfileEditDrawer
          profile={profile}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setToast("Profile updated");
          }}
        />
      )}

      {/* Restrained, and it outlives the drawer that produced it. */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 font-body text-[13px] text-cream shadow-lg"
        >
          <span className="flex items-center gap-2">
            <Check strokeWidth={2} className="h-3.5 w-3.5" aria-hidden />
            {toast}
          </span>
        </div>
      )}
    </>
  );
}

function profileToLocationValue(p: Profile): ProfileLocationValue | null {
  const placeName =
    p.location_place_name ?? [p.location_city, p.location_country].filter(Boolean).join(", ");
  if (placeName && p.location_lat != null && p.location_lng != null) {
    return {
      place_name: placeName,
      city: p.location_city,
      country: p.location_country,
      lat: p.location_lat,
      lng: p.location_lng,
      mapbox_id: p.location_mapbox_id ?? "",
    };
  }
  return null;
}

function ProfileEditDrawer({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [state, formAction] = useFormState(
    updateProfileActionForm,
    null as unknown as ProfileActionResult
  );
  const [pending, setPending] = useState(false);

  const initial = useMemo(
    () => ({
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      instagram: profile.instagram ?? "",
      linkedin: profile.linkedin ?? "",
      behance: (profile as { behance?: string | null }).behance ?? "",
    }),
    [profile]
  );

  const [values, setValues] = useState(initial);
  const [location, setLocation] = useState<ProfileLocationValue | null>(() =>
    profileToLocationValue(profile)
  );
  const initialLocationId = useMemo(
    () => profileToLocationValue(profile)?.mapbox_id ?? profileToLocationValue(profile)?.place_name ?? "",
    [profile]
  );

  const dirty =
    (Object.keys(initial) as (keyof typeof initial)[]).some((k) => values[k] !== initial[k]) ||
    (location?.mapbox_id ?? location?.place_name ?? "") !== initialLocationId;

  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  // Escape closes, and the page behind does not scroll while the drawer is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (state && "ok" in state && state.ok === true) {
      // router.refresh() re-renders the server components behind the drawer, so
      // the rail, the intro line and CONNECT all update in place — no full
      // reload, and the reader keeps their scroll position.
      router.refresh();
      onSaved();
    }
    if (state && "error" in state && state.error) setPending(false);
  }, [state, router, onSaved]);

  const displayName = profile.display_name ?? profile.username ?? "Profile";
  const error = state && "error" in state ? state.error : null;

  return (
    /* text-left is not decoration: the drawer is a DOM descendant of the rail's
       centred identity block, and `fixed` does not stop text-align inheriting.
       Without it every label, helper line and section heading in the editor
       renders centred. Anchored here rather than by removing the wrapper's
       text-center, because that wrapper is what centres the Edit profile
       button in the rail. */
    <div className="fixed inset-0 z-[60] text-left">
      {/* The profile stays visible behind a light scrim, so the owner keeps
          context while editing — the brief's requirement, and the reason this
          is a drawer rather than /me/profile. */}
      <button
        type="button"
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 bg-ink/20"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile"
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-hairline bg-cream"
      >
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-hairline px-5">
          <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">
            Edit profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="rounded p-1.5 text-muted transition-colors hover:text-ink"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </header>

        <form action={formAction} onSubmit={() => setPending(true)} className="flex min-h-0 flex-1 flex-col">
          {/* ── PRESERVED, NOT EDITED ────────────────────────────────────────
              See the note at the top: the action writes every one of these, so
              omitting them would null them. */}
          <input type="hidden" name="_profileId" value={profile.id} />
          <input type="hidden" name="username" value={profile.username ?? ""} />
          <input
            type="hidden"
            name="location_visibility"
            value={(profile as { location_visibility?: string }).location_visibility ?? "public"}
          />
          <input type="hidden" name="designer_discipline" value={profile.designer_discipline ?? ""} />
          <input type="hidden" name="brand_type" value={profile.brand_type ?? ""} />
          <input type="hidden" name="reader_type" value={profile.reader_type ?? ""} />
          <input
            type="hidden"
            name="show_designer_discipline"
            value={profile.show_designer_discipline !== false ? "true" : "false"}
          />
          <input
            type="hidden"
            name="show_brand_type"
            value={profile.show_brand_type !== false ? "true" : "false"}
          />

          <input type="hidden" name="location_place_name" value={location?.place_name ?? ""} />
          <input type="hidden" name="location_city" value={location?.city ?? ""} />
          <input type="hidden" name="location_country" value={location?.country ?? ""} />
          <input type="hidden" name="location_lat" value={location?.lat ?? ""} />
          <input type="hidden" name="location_lng" value={location?.lng ?? ""} />
          <input type="hidden" name="location_mapbox_id" value={location?.mapbox_id ?? ""} />

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <Section title="Profile">
              {/* ── AVATAR: PREVIEW + CHANGE, VIA CLERK ────────────────────
                  avatar_url is synced from the Clerk account, which is where
                  the existing editor sent people too. The `avatars` bucket and
                  uploadAvatar/deleteAvatar exist but are NOT wired here: two
                  writers for one field is a conflict, not a feature. */}
              <div className="flex items-center gap-3">
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone">
                  {profile.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center font-display text-[16px] text-muted">
                      {initialsOf(displayName)}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[13px] text-ink">Profile photo</p>
                  <button
                    type="button"
                    onClick={() => openUserProfile?.()}
                    className="mt-1 font-body text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Change in account settings
                  </button>
                </div>
              </div>

              <Field label="Name" htmlFor="pd-name">
                <input
                  id="pd-name"
                  name="display_name"
                  value={values.display_name}
                  onChange={set("display_name")}
                  className={INPUT}
                  placeholder="Studio or brand name"
                />
              </Field>

              <div className="mt-4">
                <ProfileLocationPicker
                  value={location}
                  onChange={setLocation}
                  label="Location"
                  placeholder="Search for a city or place…"
                />
              </div>
            </Section>

            {/* ── ONE FIELD, TWO PLACES ──────────────────────────────────────
                `bio` is the ONLY profile text column. The public page renders
                it twice: clamped to three lines under the cover as the short
                intro, and unclamped inside About. There is no separate About
                column, so this is one editor and the label says so rather than
                offering two boxes that overwrite each other. */}
            <Section title="Intro & About">
              <Field label="About" htmlFor="pd-bio">
                <textarea
                  id="pd-bio"
                  name="bio"
                  rows={6}
                  value={values.bio}
                  onChange={set("bio")}
                  className={`${INPUT} resize-y`}
                  placeholder="What your studio does, and what it is known for."
                />
              </Field>
              <p className="mt-1.5 font-body text-[12px] leading-[17px] text-muted">
                This appears in two places: the first few lines show as your introduction under the
                cover, and the full text fills your About section. Keep the opening concise.
              </p>
            </Section>

            <Section title="Links">
              <Field label="Website" htmlFor="pd-web">
                <input
                  id="pd-web"
                  name="website"
                  type="url"
                  value={values.website}
                  onChange={set("website")}
                  className={INPUT}
                  placeholder="https://"
                />
              </Field>
              <Field label="Instagram" htmlFor="pd-ig">
                <input
                  id="pd-ig"
                  name="instagram"
                  value={values.instagram}
                  onChange={set("instagram")}
                  className={INPUT}
                  placeholder="@handle"
                />
              </Field>
              <Field label="LinkedIn" htmlFor="pd-li">
                <input
                  id="pd-li"
                  name="linkedin"
                  value={values.linkedin}
                  onChange={set("linkedin")}
                  className={INPUT}
                  placeholder="URL or handle"
                />
              </Field>
              <Field label="Behance" htmlFor="pd-be">
                <input
                  id="pd-be"
                  name="behance"
                  value={values.behance}
                  onChange={set("behance")}
                  className={INPUT}
                  placeholder="URL or handle"
                />
              </Field>
              {/* Pinterest and X/Twitter are absent because `profiles` has no
                  column for either. Website, Instagram, LinkedIn and Behance
                  are the four the schema holds; CONNECT renders each only when
                  it has a value, so blanks cost nothing. */}
              <p className="mt-3 font-body text-[12px] leading-[17px] text-muted">
                Links appear under Connect on your profile once they have a value.
              </p>
            </Section>
          </div>

          <footer className="shrink-0 border-t border-hairline bg-cream px-5 py-4">
            {error && (
              <p role="alert" className="mb-2.5 font-body text-[12px] text-red-600">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg border border-ink/25 font-body text-[13px] text-ink transition-colors hover:bg-stone/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!dirty || pending}
                className="h-10 flex-1 rounded-lg bg-ink font-body text-[13px] text-cream transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-hairline bg-white px-3 py-2 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 border-b border-hairline pb-6 last:mb-0 last:border-b-0 last:pb-0">
      <h3 className="mb-3 font-body text-[11px] uppercase tracking-[0.12em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <label htmlFor={htmlFor} className="mb-1.5 block font-body text-[12px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
