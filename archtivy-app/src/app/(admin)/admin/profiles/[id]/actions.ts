"use server";

import { redirect } from "next/navigation";
import { updateProfile } from "@/app/(admin)/admin/_actions/profiles";

export async function updateAdminProfileAction(formData: FormData) {
  const id = (formData.get("_profileId") as string)?.trim();
  if (!id) {
    redirect("/admin/profiles?error=missing-id");
  }
  const res = await updateProfile({
    id,
    patch: {
      display_name: formData.get("display_name"),
      username: formData.get("username"),
      location_city: formData.get("location_city"),
      location_country: formData.get("location_country"),
      bio: formData.get("bio"),
      website: formData.get("website"),
      instagram: formData.get("instagram"),
      linkedin: formData.get("linkedin"),
      avatar_url: formData.get("avatar_url"),
      designer_discipline: formData.get("designer_discipline"),
      brand_type: formData.get("brand_type"),
    },
  });
  if (!res.ok) {
    redirect(`/admin/profiles/${id}?error=${encodeURIComponent(res.error)}`);
  }
  redirect(`/admin/profiles/${id}?saved=1`);
}
