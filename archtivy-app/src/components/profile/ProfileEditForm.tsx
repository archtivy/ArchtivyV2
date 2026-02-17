"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useClerk } from "@clerk/nextjs";
import type { Profile } from "@/lib/types/profiles";
import { updateProfileActionForm } from "@/app/actions/profile";
import type { ProfileActionResult } from "@/app/actions/profile";
import { ProfileLocationPicker } from "@/components/location/ProfileLocationPicker";
import type { ProfileLocationValue } from "@/components/location/ProfileLocationPicker";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ErrorMessage";
import { DESIGNER_TITLES, BRAND_TYPES, READER_TYPES } from "@/lib/auth/config";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass =
  "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";

interface ProfileEditFormProps {
  profile: Profile;
}

function profileToLocationValue(p: Profile): ProfileLocationValue | null {
  const lat = p.location_lat;
  const lng = p.location_lng;
  const placeName = p.location_place_name ?? [p.location_city, p.location_country].filter(Boolean).join(", ");
  if (placeName && lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return {
      place_name: placeName,
      city: p.location_city,
      country: p.location_country,
      lat,
      lng,
      mapbox_id: p.location_mapbox_id ?? "",
    };
  }
  return null;
}

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const { openUserProfile } = useClerk();
  const [locationValue, setLocationValue] = useState<ProfileLocationValue | null>(() =>
    profileToLocationValue(profile)
  );
  const [locationVisibility, setLocationVisibility] = useState(
    (profile as { location_visibility?: string }).location_visibility !== "private"
  );
  const [showDesignerDiscipline, setShowDesignerDiscipline] = useState(
    profile.show_designer_discipline !== false
  );
  const [showBrandType, setShowBrandType] = useState(
    profile.show_brand_type !== false
  );
  const [state, formAction] = useFormState(
    updateProfileActionForm,
    null as unknown as ProfileActionResult
  );

  useEffect(() => {
    if (state && "ok" in state && state.ok === true) {
      window.location.reload();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="_profileId" value={profile.id} />
      <div>
        <p className="mb-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100">Profile photo</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your photo is managed by your account. Change it in account settings.
        </p>
        <button
          type="button"
          onClick={() => openUserProfile?.()}
          className="mt-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          Change photo
        </button>
      </div>
      <div>
        <label htmlFor="display_name" className={labelClass}>
          Display name
        </label>
        <input
          id="display_name"
          type="text"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          className={inputClass}
          placeholder="Display name"
        />
      </div>
      <div>
        <label htmlFor="username" className={labelClass}>
          Username <span className="text-archtivy-primary">*</span>
        </label>
        <input
          id="username"
          type="text"
          name="username"
          required
          defaultValue={profile.username ?? ""}
          className={inputClass}
          placeholder="username"
          pattern="[a-z0-9-]+"
        />
      </div>
      <div>
        <label htmlFor="bio" className={labelClass}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ""}
          className={inputClass}
          placeholder="Short bio"
        />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Location & Privacy
        </h4>
        <ProfileLocationPicker
          value={locationValue}
          onChange={setLocationValue}
          label="Location"
          placeholder="Search for a city or place…"
        />
        <input type="hidden" name="location_place_name" value={locationValue?.place_name ?? ""} />
        <input type="hidden" name="location_city" value={locationValue?.city ?? ""} />
        <input type="hidden" name="location_country" value={locationValue?.country ?? ""} />
        <input type="hidden" name="location_lat" value={locationValue?.lat ?? ""} />
        <input type="hidden" name="location_lng" value={locationValue?.lng ?? ""} />
        <input type="hidden" name="location_mapbox_id" value={locationValue?.mapbox_id ?? ""} />
        <input type="hidden" name="location_visibility" value={locationVisibility ? "public" : "private"} />
        <div className="mt-2 flex items-center gap-2">
          <input
            id="location_visibility_toggle"
            type="checkbox"
            checked={locationVisibility}
            onChange={(e) => setLocationVisibility(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-archtivy-primary focus:ring-archtivy-primary"
          />
          <label htmlFor="location_visibility_toggle" className="text-sm text-zinc-700 dark:text-zinc-300">
            Show my location on the map
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="website" className={labelClass}>
          Website
        </label>
        <input
          id="website"
          type="url"
          name="website"
          defaultValue={profile.website ?? ""}
          className={inputClass}
          placeholder="https://"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="instagram" className={labelClass}>
            Instagram
          </label>
          <input
            id="instagram"
            type="text"
            name="instagram"
            defaultValue={profile.instagram ?? ""}
            className={inputClass}
            placeholder="@handle"
          />
        </div>
        <div>
          <label htmlFor="linkedin" className={labelClass}>
            LinkedIn
          </label>
          <input
            id="linkedin"
            type="text"
            name="linkedin"
            defaultValue={profile.linkedin ?? ""}
            className={inputClass}
            placeholder="URL or handle"
          />
        </div>
      </div>
      {profile.role === "designer" && (
        <>
          <div>
            <label htmlFor="designer_discipline" className={labelClass}>
              Title / discipline
            </label>
            <select
              id="designer_discipline"
              name="designer_discipline"
              className={inputClass}
              defaultValue={profile.designer_discipline ?? ""}
            >
              <option value="">— Optional —</option>
              {DESIGNER_TITLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show_designer_discipline"
              type="checkbox"
              checked={showDesignerDiscipline}
              onChange={(e) => setShowDesignerDiscipline(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-archtivy-primary focus:ring-archtivy-primary"
            />
            <input type="hidden" name="show_designer_discipline" value={showDesignerDiscipline ? "true" : "false"} />
            <label htmlFor="show_designer_discipline" className="text-sm text-zinc-700 dark:text-zinc-300">
              Show title on my public profile
            </label>
          </div>
        </>
      )}
      {profile.role === "brand" && (
        <>
          <div>
            <label htmlFor="brand_type" className={labelClass}>
              Brand type
            </label>
            <select
              id="brand_type"
              name="brand_type"
              className={inputClass}
              defaultValue={profile.brand_type ?? ""}
            >
              <option value="">— Optional —</option>
              {BRAND_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="show_brand_type"
              type="checkbox"
              checked={showBrandType}
              onChange={(e) => setShowBrandType(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-archtivy-primary focus:ring-archtivy-primary"
            />
            <input type="hidden" name="show_brand_type" value={showBrandType ? "true" : "false"} />
            <label htmlFor="show_brand_type" className="text-sm text-zinc-700 dark:text-zinc-300">
              Show brand type on my public profile
            </label>
          </div>
        </>
      )}
      {profile.role === "reader" && (
        <div>
          <label htmlFor="reader_type" className={labelClass}>
            Reader type
          </label>
          <select
            id="reader_type"
            name="reader_type"
            className={inputClass}
            defaultValue={profile.reader_type ?? ""}
          >
            <option value="">— Optional —</option>
            {READER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}
      {state && "error" in state && state.error && (
        <ErrorMessage message={state.error} />
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
