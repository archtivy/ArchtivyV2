export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { createNotification } from "@/lib/db/notifications";
import { createAuditLog } from "@/lib/db/audit";
import { auth } from "@clerk/nextjs/server";

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 280;

/**
 * Hard ceiling on a single broadcast.
 *
 * Not a performance limit — it is a blast-radius limit. A mistyped segment
 * writes one row per recipient with no undo, so the largest accidental send is
 * capped and the operator is told the cap was hit rather than silently
 * receiving a partial delivery.
 */
const MAX_RECIPIENTS = 500;

export type AudienceKind = "profile" | "role" | "all";

/**
 * GET — recent admin-sent notifications, collapsed by send.
 *
 * A broadcast is N rows sharing one group_key; listing them individually would
 * turn a single send to 40 designers into 40 identical table rows. Rows are
 * grouped so the history reads as one entry per send, with its real recipient
 * count and how many have been read.
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("notifications")
    .select(
      "id, recipient_profile_id, title, body, cta_label, cta_url, priority, created_at, is_read, group_key"
    )
    .eq("source", "admin")
    .eq("event_type", "admin_update")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    id: string;
    recipient_profile_id: string;
    title: string | null;
    body: string | null;
    cta_label: string | null;
    cta_url: string | null;
    priority: string;
    created_at: string;
    is_read: boolean;
    group_key: string | null;
  };

  const rows = (data ?? []) as Row[];

  // Individual sends have no group_key, so they key on their own id and stay
  // one entry each.
  const buckets = new Map<string, Row[]>();
  for (const r of rows) {
    const key = r.group_key ?? `single:${r.id}`;
    const list = buckets.get(key);
    if (list) list.push(r);
    else buckets.set(key, [r]);
  }

  // Name single recipients; a broadcast is described by its size instead.
  const singleRecipientIds = Array.from(buckets.values())
    .filter((b) => b.length === 1)
    .map((b) => b[0].recipient_profile_id);

  const recipientMap: Record<string, { display_name: string | null; username: string | null }> = {};
  if (singleRecipientIds.length > 0) {
    const { data: profiles } = await sup
      .from("profiles")
      .select("id, display_name, username")
      .in("id", Array.from(new Set(singleRecipientIds)));
    for (const p of profiles ?? []) {
      const row = p as { id: string; display_name: string | null; username: string | null };
      recipientMap[row.id] = { display_name: row.display_name, username: row.username };
    }
  }

  const items = Array.from(buckets.values()).map((bucket) => {
    const first = bucket[0];
    const single = bucket.length === 1;
    const profile = single ? recipientMap[first.recipient_profile_id] : undefined;
    return {
      id: first.id,
      group_key: first.group_key,
      recipient_count: bucket.length,
      recipient_display_name: profile?.display_name ?? null,
      recipient_username: profile?.username ?? null,
      read_count: bucket.filter((r) => r.is_read).length,
      title: first.title,
      body: first.body,
      cta_label: first.cta_label,
      cta_url: first.cta_url,
      priority: first.priority,
      created_at: first.created_at,
    };
  });

  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ data: items });
}

/**
 * POST — send an admin notification to one profile, a role segment, or everyone.
 *
 * Reuses the existing notifications table and createNotification() unchanged:
 * an admin-authored notification is the same row shape as a follow-triggered
 * one, distinguished only by source='admin'. There is no separate delivery
 * mechanism to build — the bell, the dropdown and /me/notifications already
 * render whatever is in the table.
 */
export async function POST(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const audience: AudienceKind =
    body.audience === "role" || body.audience === "all" ? body.audience : "profile";
  const recipientProfileId =
    typeof body.recipient_profile_id === "string" ? body.recipient_profile_id.trim() : "";
  const audienceRole = typeof body.audience_role === "string" ? body.audience_role.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.body === "string" ? body.body.trim() : "";
  const ctaLabel = typeof body.cta_label === "string" ? body.cta_label.trim() : "";
  const ctaUrl = typeof body.cta_url === "string" ? body.cta_url.trim() : "";
  const priority =
    typeof body.priority === "string" && ["low", "normal", "high"].includes(body.priority)
      ? (body.priority as "low" | "normal" | "high")
      : "normal";

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });
  if (title.length > MAX_TITLE_LENGTH)
    return NextResponse.json(
      { error: `Title must be under ${MAX_TITLE_LENGTH} characters.` },
      { status: 400 }
    );
  if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
  if (message.length > MAX_BODY_LENGTH)
    return NextResponse.json(
      { error: `Message must be under ${MAX_BODY_LENGTH} characters.` },
      { status: 400 }
    );

  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    return NextResponse.json(
      { error: "Both CTA label and URL are required if either is provided." },
      { status: 400 }
    );
  }

  // A CTA must stay on the platform. An admin-authored notification renders
  // with the platform's authority, so it must not be able to point a user at
  // an arbitrary external URL.
  if (ctaUrl && !ctaUrl.startsWith("/")) {
    return NextResponse.json(
      { error: "CTA URL must be an internal path starting with /." },
      { status: 400 }
    );
  }

  const sup = getSupabaseServiceClient();

  // ── Resolve the audience to a concrete recipient list ─────────────────────
  let recipientIds: string[] = [];

  if (audience === "profile") {
    if (!recipientProfileId)
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    const { data: profile } = await sup
      .from("profiles")
      .select("id")
      .eq("id", recipientProfileId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!profile)
      return NextResponse.json({ error: "Recipient profile not found." }, { status: 404 });
    recipientIds = [recipientProfileId];
  } else {
    let query = sup.from("profiles").select("id").is("deleted_at", null);

    if (audience === "role") {
      if (!["designer", "brand", "reader"].includes(audienceRole)) {
        return NextResponse.json({ error: "Unknown audience role." }, { status: 400 });
      }
      query = query.eq("role", audienceRole);
    }

    // Only profiles that can actually sign in and see a bell. A credit stub
    // with no clerk_user_id would receive a row nobody will ever read.
    query = query.not("clerk_user_id", "is", null);

    const { data: profiles, error: audienceError } = await query.limit(MAX_RECIPIENTS + 1);
    if (audienceError)
      return NextResponse.json({ error: audienceError.message }, { status: 500 });

    recipientIds = ((profiles ?? []) as { id: string }[]).map((p) => p.id);

    if (recipientIds.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `That audience is larger than the ${MAX_RECIPIENTS}-recipient limit for a single send. Narrow it and try again.`,
        },
        { status: 400 }
      );
    }
    if (recipientIds.length === 0) {
      return NextResponse.json(
        { error: "That audience currently has no reachable profiles." },
        { status: 400 }
      );
    }
  }

  // A shared group_key is what lets the history collapse a broadcast back into
  // one entry, and what would let a future undo find every row it wrote.
  const groupKey =
    audience === "profile"
      ? null
      : `admin_broadcast:${audience}:${audienceRole || "all"}:${Date.now()}`;

  let sent = 0;
  const failures: string[] = [];

  for (const id of recipientIds) {
    const result = await createNotification({
      recipient_profile_id: id,
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
      group_key: groupKey,
    });
    if (result.error) failures.push(result.error);
    else sent += 1;
  }

  // A broadcast is not undoable, so it is recorded whether or not it fully
  // succeeded — including the partial case, which is the one worth finding later.
  const { userId } = await auth();
  await createAuditLog({
    adminUserId: userId ?? "",
    action: "notification.send",
    entityType: "notification",
    entityId: groupKey ?? recipientIds[0] ?? "",
    metadata: {
      audience,
      audienceRole: audienceRole || null,
      requested: recipientIds.length,
      sent,
      failed: failures.length,
      title,
    },
  });

  if (sent === 0) {
    return NextResponse.json(
      { error: failures[0] ?? "Nothing could be sent." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed: failures.length,
    // Reported rather than swallowed: a send that reached 38 of 40 people is
    // not a success, and the operator is the only one who can decide what to
    // do about it.
    partial: failures.length > 0,
  });
}
