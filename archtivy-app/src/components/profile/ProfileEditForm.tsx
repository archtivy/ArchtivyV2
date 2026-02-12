"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import type { Profile } from "@/lib/types/profiles";
import { updateProfileActionForm } from "@/app/actions/profile";
import type { ProfileActionResult } from "@/app/actions/profile";
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

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="location_city" className={labelClass}>
            City
          </label>
          <input
            id="location_city"
            type="text"
            name="location_city"
            defaultValue={profile.location_city ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="location_country" className={labelClass}>
            Country
          </label>
          <input
            id="location_country"
            type="text"
            name="location_country"
            defaultValue={profile.location_country ?? ""}
            className={inputClass}
          />
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
      )}
      {profile.role === "brand" && (
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
