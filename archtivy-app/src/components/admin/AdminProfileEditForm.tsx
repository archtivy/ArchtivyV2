"use client";

import { useState } from "react";
import { AdminAvatarSection } from "@/components/admin/AdminAvatarSection";
import { AdminLocationPicker } from "@/components/admin/AdminLocationPicker";
import type { AdminLocationValue } from "@/components/admin/AdminLocationPicker";
import { DESIGNER_TITLES, BRAND_TYPES } from "@/lib/auth/config";
import type { ProfileRole } from "@/lib/auth/config";

const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20";
const labelClass = "text-sm font-medium text-zinc-900";
const selectClass =
  "mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20";

interface ProfileRecord {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location_city: string | null;
  location_country: string | null;
  location_place_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_mapbox_id: string | null;
  role: string | null;
  designer_discipline: string | null;
  brand_type: string | null;
  reader_type: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
}

function profileToLocationValue(p: ProfileRecord): AdminLocationValue | null {
  const lat = p.location_lat;
  const lng = p.location_lng;
  const placeName =
    p.location_place_name ??
    [p.location_city, p.location_country].filter(Boolean).join(", ");
  if (
    placeName &&
    lat != null &&
    lng != null &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
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

const ROLES: { value: ProfileRole; label: string }[] = [
  { value: "designer", label: "Designer" },
  { value: "brand", label: "Brand" },
  { value: "reader", label: "Reader" },
];

const designerTitles = [...DESIGNER_TITLES];
const brandTypes = [...BRAND_TYPES];

export interface AdminProfileEditFormProps {
  profile: ProfileRecord;
  formAction: (formData: FormData) => Promise<void>;
}

export function AdminProfileEditForm({ profile, formAction }: AdminProfileEditFormProps) {
  const [locationValue, setLocationValue] = useState<AdminLocationValue | null>(
    () => profileToLocationValue(profile)
  );
  const role = (profile.role ?? "") as string;
  const [selectedRole, setSelectedRole] = useState<string>(
    role && ["designer", "brand", "reader"].includes(role) ? role : role || ""
  );
  const hasLegacyRole =
    role && !["designer", "brand", "reader"].includes(role);
  const designerDiscipline = profile.designer_discipline ?? "";
  const brandType = profile.brand_type ?? "";

  const hasLegacyDesigner =
    profile.role === "designer" &&
    designerDiscipline &&
    !designerTitles.includes(designerDiscipline as (typeof designerTitles)[number]);
  const hasLegacyBrand =
    profile.role === "brand" &&
    brandType &&
    !brandTypes.includes(brandType as (typeof brandTypes)[number]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="_profileId" value={profile.id} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <AdminAvatarSection
            profileId={profile.id}
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Display name</label>
          <input
            name="display_name"
            defaultValue={profile.display_name ?? ""}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Username</label>
          <input
            name="username"
            defaultValue={profile.username ?? ""}
            className={inputClass}
          />
          <div className="mt-1 text-xs text-zinc-500">Public URL: /u/[username]</div>
        </div>

        <div className="md:col-span-2">
          <AdminLocationPicker
            value={locationValue}
            onChange={setLocationValue}
            label="Location"
            placeholder="Search for a city or place…"
            legacyCity={profile.location_city}
            legacyCountry={profile.location_country}
          />
          <input type="hidden" name="location_place_name" value={locationValue?.place_name ?? ""} />
          <input
            type="hidden"
            name="location_city"
            value={locationValue?.city ?? profile.location_city ?? ""}
          />
          <input
            type="hidden"
            name="location_country"
            value={locationValue?.country ?? profile.location_country ?? ""}
          />
          <input type="hidden" name="location_lat" value={locationValue?.lat ?? ""} />
          <input type="hidden" name="location_lng" value={locationValue?.lng ?? ""} />
          <input type="hidden" name="location_mapbox_id" value={locationValue?.mapbox_id ?? ""} />
        </div>

        <div>
          <label htmlFor="role" className={labelClass}>
            Role
          </label>
          <select
            id="role"
            name="role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value || "")}
            className={selectClass}
          >
            <option value="">—</option>
            {hasLegacyRole && (
              <option value={role}>Legacy: {role}</option>
            )}
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {selectedRole === "designer" && (
          <div>
            <label htmlFor="designer_discipline" className={labelClass}>
              Designer discipline
            </label>
            <select
              id="designer_discipline"
              name="designer_discipline"
              defaultValue={designerDiscipline}
              className={selectClass}
            >
              <option value="">—</option>
              {hasLegacyDesigner && (
                <option value={designerDiscipline}>
                  Legacy: {designerDiscipline}
                </option>
              )}
              {designerTitles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRole === "brand" && (
          <div>
            <label htmlFor="brand_type" className={labelClass}>
              Brand type
            </label>
            <select
              id="brand_type"
              name="brand_type"
              defaultValue={brandType}
              className={selectClass}
            >
              <option value="">—</option>
              {hasLegacyBrand && (
                <option value={brandType}>Legacy: {brandType}</option>
              )}
              {brandTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRole === "reader" && (
          <>
            <input type="hidden" name="designer_discipline" value="" />
            <input type="hidden" name="brand_type" value="" />
          </>
        )}
        {selectedRole !== "designer" && selectedRole !== "reader" && (
          <input type="hidden" name="designer_discipline" value="" />
        )}
        {selectedRole !== "brand" && selectedRole !== "reader" && (
          <input type="hidden" name="brand_type" value="" />
        )}
      </div>

      <div>
        <label className={labelClass}>Bio</label>
        <textarea
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Website</label>
          <input
            name="website"
            defaultValue={profile.website ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Instagram</label>
          <input
            name="instagram"
            defaultValue={profile.instagram ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>LinkedIn</label>
          <input
            name="linkedin"
            defaultValue={profile.linkedin ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:opacity-90"
      >
        Save
      </button>
    </form>
  );
}
