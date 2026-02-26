"use server";

import { createHash } from "crypto";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());
const toNull = (v: unknown) => {
  const s = toText(v);
  return s.length ? s : null;
};
const toNumOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? null : n;
};

/** Pick only keys that exist in the object; returns a new object. */
function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

/** Columns that exist in public.profiles when table is empty (auth-migrations base + 2b). */
const PROFILES_INSERT_ALLOWLIST = [
  "clerk_user_id",
  "role",
  "display_name",
  "username",
  "location_city",
  "location_country",
  "bio",
  "website",
  "instagram",
  "linkedin",
  "avatar_url",
  "designer_title",
  "brand_type",
  "reader_type",
] as const;

async function getProfilesAllowedKeys(supabase: ReturnType<typeof getSupabaseServiceClient>): Promise<string[]> {
  const { data, error } = await supabase.from("profiles").select("*").limit(1);
  if (error) return [...PROFILES_INSERT_ALLOWLIST];
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === "object" && !Array.isArray(row)) {
    return Object.keys(row).filter((k) => k !== "id" && k !== "created_at" && k !== "updated_at");
  }
  return [...PROFILES_INSERT_ALLOWLIST];
}

export async function createProfileAndGo(input: {
  type: "designer" | "studio" | "brand" | "photographer";
  name: string;
  username?: string;
  location_city?: string;
  location_country?: string;
  website?: string;
  bio?: string;
}) {
  const supabase = getSupabaseServiceClient();
  const allowedKeys = await getProfilesAllowedKeys(supabase);
  const clerk_user_id = `archtivy_internal_${crypto.randomUUID()}`;
  const type = input.type;
  const role = type === "brand" ? "brand" : "designer";

  const row: Record<string, unknown> = {
    clerk_user_id,
    role,
    display_name: toNull(input.name),
    username: toNull(input.username),
    location_city: toNull(input.location_city),
    location_country: toNull(input.location_country),
    designer_title:
      type === "studio" ? "Studio" : type === "photographer" ? "Photographer" : null,
    brand_type: type === "brand" ? "Manufacturer" : null,
    reader_type: null,
    bio: toNull(input.bio),
    website: toNull(input.website),
    instagram: null,
    linkedin: null,
    avatar_url: null,
  };

  const payload = pick(row, allowedKeys);

  const { data, error } = await supabase.from("profiles").insert(payload).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  const id = data?.id as string | undefined;
  if (!id) return { ok: false as const, error: "Insert did not return id" };

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  redirect(`/admin/profiles/${id}`);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function generateClaimLink(
  profileId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = getSupabaseServiceClient();

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", profileId)
    .maybeSingle();
  if (fetchError) return { ok: false as const, error: fetchError.message };
  const username = toText((profile as { username: string | null } | null)?.username);
  if (!username) return { ok: false as const, error: "Profile has no username set." };

  const token = crypto.randomUUID() + randomBytes(24).toString("hex");
  const tokenHash = sha256Hex(token);

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      claim_token_hash: tokenHash,
      claim_expires_at: expiresAt,
      claim_status: "unclaimed",
      owner_user_id: null,
      claimed_at: null,
    })
    .eq("id", profileId);

  if (error) return { ok: false as const, error: error.message };

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "https://archtivy.com";
  const url = `${base}/u/${encodeURIComponent(username)}/claim?token=${encodeURIComponent(token)}`;
  return { ok: true as const, url };
}

export async function updateProfile(input: {
  id: string;
  patch: Record<string, unknown>;
}) {
  const supabase = getSupabaseServiceClient();
  const patch: Record<string, unknown> = {
    display_name: toNull(input.patch.display_name),
    username: toNull(input.patch.username),
    location_city: toNull(input.patch.location_city),
    location_country: toNull(input.patch.location_country),
    location_place_name: toNull(input.patch.location_place_name),
    location_lat: toNumOrNull(input.patch.location_lat),
    location_lng: toNumOrNull(input.patch.location_lng),
    location_mapbox_id: toNull(input.patch.location_mapbox_id),
    bio: toNull(input.patch.bio),
    website: toNull(input.patch.website),
    instagram: toNull(input.patch.instagram),
    linkedin: toNull(input.patch.linkedin),
    avatar_url: toNull(input.patch.avatar_url),
    role: toNull(input.patch.role),
    designer_discipline: toNull(input.patch.designer_discipline),
    brand_type: toNull(input.patch.brand_type),
    reader_type: toNull(input.patch.reader_type),
  };

  const { error } = await supabase.from("profiles").update(patch).eq("id", input.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/profiles");
  revalidatePath(`/admin/profiles/${input.id}`);
  revalidatePath("/admin");
  revalidatePath("/u/[username]", "page");
  revalidatePath("/u/id/[profileId]", "page");
  revalidatePath("/me/listings");
  revalidatePath("/explore");
  return { ok: true as const };
}

export async function bulkUpdateProfiles(input: {
  ids: string[];
  patch: Record<string, unknown>;
}) {
  const ids = Array.from(new Set(input.ids)).filter(Boolean);
  if (ids.length === 0) return { ok: false as const, error: "No ids provided" };

  const supabase = getSupabaseServiceClient();
  const patch = {
    display_name: input.patch.display_name != null ? toNull(input.patch.display_name) : undefined,
    username: input.patch.username != null ? toNull(input.patch.username) : undefined,
    location_city: input.patch.location_city != null ? toNull(input.patch.location_city) : undefined,
    location_country: input.patch.location_country != null ? toNull(input.patch.location_country) : undefined,
  } as Record<string, unknown>;

  // Remove undefined keys so Supabase doesn't write them.
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete patch[k];
  }

  const { error } = await supabase.from("profiles").update(patch).in("id", ids);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  revalidatePath("/u/[username]", "page");
  return { ok: true as const };
}

