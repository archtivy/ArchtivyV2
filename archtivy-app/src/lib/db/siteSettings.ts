import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Read a site setting by key. Returns the string value or null if not found.
 */
export async function getSiteSetting(key: string): Promise<string | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[siteSettings] getSiteSetting error:", error.message);
    return null;
  }
  return data?.value ?? null;
}

/**
 * Read a boolean site setting. Returns false if not found or not "true".
 */
export async function getSiteSettingBool(key: string): Promise<boolean> {
  const value = await getSiteSetting(key);
  return value === "true";
}

/**
 * Write a site setting (upsert).
 */
export async function setSiteSetting(key: string, value: string): Promise<boolean> {
  const sup = getSupabaseServiceClient();
  const { error } = await sup
    .from("site_settings")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  if (error) {
    console.error("[siteSettings] setSiteSetting error:", error.message);
    return false;
  }
  return true;
}

// ── Typed helpers for specific settings ──────────────────────────────────────

export const SETTINGS_KEYS = {
  FEATURE_LISTING_ENABLED: "feature_listing_enabled",
} as const;

export async function isFeatureListingEnabled(): Promise<boolean> {
  return getSiteSettingBool(SETTINGS_KEYS.FEATURE_LISTING_ENABLED);
}
