export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { createNotification } from "@/lib/db/notifications";

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 280;

/**
 * GET — list recent admin-sent notifications (for the table).
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("notifications")
    .select("id, recipient_profile_id, title, body, cta_label, cta_url, priority, created_at, is_read")
    .eq("source", "admin")
    .eq("event_type", "admin_update")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch-fetch recipient display names
  const recipientIds = Array.from(
    new Set((data ?? []).map((n: { recipient_profile_id: string }) => n.recipient_profile_id))
  );
  let recipientMap: Record<string, { display_name: string | null; username: string | null }> = {};
  if (recipientIds.length > 0) {
    const { data: profiles } = await sup
      .from("profiles")
      .select("id, display_name, username")
      .in("id", recipientIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; display_name: string | null; username: string | null };
      recipientMap[row.id] = { display_name: row.display_name, username: row.username };
    }
  }

  const items = (data ?? []).map((n: {
    id: string;
    recipient_profile_id: string;
    title: string | null;
    body: string | null;
    cta_label: string | null;
    cta_url: string | null;
    priority: string;
    created_at: string;
    is_read: boolean;
  }) => ({
    ...n,
    recipient_display_name: recipientMap[n.recipient_profile_id]?.display_name ?? null,
    recipient_username: recipientMap[n.recipient_profile_id]?.username ?? null,
  }));

  return NextResponse.json({ data: items });
}

/**
 * POST — create admin notification.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const recipientProfileId = typeof body.recipient_profile_id === "string" ? body.recipient_profile_id.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const ctaLabel = typeof body.cta_label === "string" ? body.cta_label.trim() : "";
  const ctaUrl = typeof body.cta_url === "string" ? body.cta_url.trim() : "";
  const priority = typeof body.priority === "string" && ["low", "normal", "high"].includes(body.priority)
    ? (body.priority as "low" | "normal" | "high")
    : "normal";

  if (!recipientProfileId) return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (title.length > MAX_TITLE_LENGTH) return NextResponse.json({ error: `Title must be under ${MAX_TITLE_LENGTH} characters.` }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > MAX_BODY_LENGTH) return NextResponse.json({ error: `Message must be under ${MAX_BODY_LENGTH} characters.` }, { status: 400 });

  // Validate CTA: if one is set, both must be set
  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return NextResponse.json({ error: "Both CTA label and URL are required if either is provided." }, { status: 400 });
  }

  // Validate recipient exists
  const sup = getSupabaseServiceClient();
  const { data: profile } = await sup
    .from("profiles")
    .select("id")
    .eq("id", recipientProfileId)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Recipient profile not found." }, { status: 404 });

  const result = await createNotification({
    recipient_profile_id: recipientProfileId,
    actor_profile_id: null,
    source: "admin",
    event_type: "admin_update",
    entity_type: null,
    entity_id: null,
    title,
    body: message,
    cta_label: ctaLabel || null,
    cta_url: ctaUrl || null,
    priority,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  return NextResponse.json({ ok: true, id: result.data });
}
