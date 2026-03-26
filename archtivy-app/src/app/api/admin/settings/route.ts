import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSiteSetting, setSiteSetting, SETTINGS_KEYS } from "@/lib/db/siteSettings";

/**
 * GET /api/admin/settings — returns all managed site settings.
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const featureListingEnabled = await getSiteSetting(SETTINGS_KEYS.FEATURE_LISTING_ENABLED);

  return NextResponse.json({
    feature_listing_enabled: featureListingEnabled === "true",
  });
}

/**
 * PATCH /api/admin/settings — update site settings.
 * Body: { feature_listing_enabled?: boolean }
 */
export async function PATCH(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await request.json();

  if (typeof body.feature_listing_enabled === "boolean") {
    await setSiteSetting(
      SETTINGS_KEYS.FEATURE_LISTING_ENABLED,
      body.feature_listing_enabled ? "true" : "false"
    );
  }

  return NextResponse.json({ ok: true });
}
