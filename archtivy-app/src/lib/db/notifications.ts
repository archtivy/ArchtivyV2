import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "notifications";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type NotificationSource = "system" | "follow_event" | "admin";

export type NotificationEventType =
  | "new_follower"
  | "mentioned_in_project"
  | "mentioned_in_product"
  | "designer_published_project"
  | "brand_published_product"
  | "followed_category_new_listing"
  | "followed_material_new_listing"
  | "admin_update";

export type NotificationPriority = "low" | "normal" | "high";

export interface NotificationRow {
  id: string;
  recipient_profile_id: string;
  actor_profile_id: string | null;
  source: NotificationSource;
  event_type: NotificationEventType;
  entity_type: string | null;
  entity_id: string | null;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  is_read: boolean;
  priority: NotificationPriority;
  group_key: string | null;
  created_at: string;
}

export interface NotificationWithActor extends NotificationRow {
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  actor_username: string | null;
}

export interface CreateNotificationInput {
  recipient_profile_id: string;
  actor_profile_id?: string | null;
  source: NotificationSource;
  event_type: NotificationEventType;
  entity_type?: string | null;
  entity_id?: string | null;
  title?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  priority?: NotificationPriority;
  group_key?: string | null;
}

/**
 * Fetch paginated notifications for a profile, with actor info joined.
 */
export async function getNotificationsForProfile(
  profileId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<DbResult<{ items: NotificationWithActor[]; total: number }>> {
  const sup = getSupabaseServiceClient();

  // Count total
  const { count, error: countErr } = await sup
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", profileId);

  if (countErr) return { data: null, error: countErr.message };

  // Fetch page
  const { data, error } = await sup
    .from(TABLE)
    .select("*")
    .eq("recipient_profile_id", profileId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { data: null, error: error.message };

  const rows = (data ?? []) as NotificationRow[];

  // Batch-fetch actor profiles
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_profile_id).filter(Boolean))
  ) as string[];

  let actorMap: Record<string, { display_name: string | null; avatar_url: string | null; username: string | null }> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await sup
      .from("profiles")
      .select("id, display_name, avatar_url, username")
      .in("id", actorIds);
    for (const p of profiles ?? []) {
      const row = p as { id: string; display_name: string | null; avatar_url: string | null; username: string | null };
      actorMap[row.id] = row;
    }
  }

  const items: NotificationWithActor[] = rows.map((r) => {
    const actor = r.actor_profile_id ? actorMap[r.actor_profile_id] : null;
    return {
      ...r,
      actor_display_name: actor?.display_name ?? null,
      actor_avatar_url: actor?.avatar_url ?? null,
      actor_username: actor?.username ?? null,
    };
  });

  return { data: { items, total: count ?? 0 }, error: null };
}

/**
 * Get unread notification count.
 */
export async function getUnreadCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("recipient_profile_id", profileId)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq("id", notificationId);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Mark all notifications as read for a profile.
 */
export async function markAllAsRead(profileId: string): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(TABLE)
    .update({ is_read: true })
    .eq("recipient_profile_id", profileId)
    .eq("is_read", false);
  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

/**
 * Insert a new notification.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<DbResult<string>> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from(TABLE)
    .insert({
      recipient_profile_id: input.recipient_profile_id,
      actor_profile_id: input.actor_profile_id ?? null,
      source: input.source,
      event_type: input.event_type,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      title: input.title ?? null,
      body: input.body ?? null,
      cta_label: input.cta_label ?? null,
      cta_url: input.cta_url ?? null,
      priority: input.priority ?? "normal",
      group_key: input.group_key ?? null,
    })
    .select("id")
    .single();

  if (error) return { data: null, error: error.message };
  return { data: (data as { id: string }).id, error: null };
}

/**
 * Grouped notification: if a recent notification (< 1 hour) with the same
 * group_key exists, skip creating a duplicate. Otherwise create new.
 */
export async function createGroupedNotification(
  input: CreateNotificationInput & { group_key: string }
): Promise<DbResult<string>> {
  const sup = getSupabaseServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: existing } = await sup
    .from(TABLE)
    .select("id")
    .eq("group_key", input.group_key)
    .gte("created_at", oneHourAgo)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Recent grouped notification exists — skip
    return { data: (existing as { id: string }).id, error: null };
  }

  return createNotification(input);
}
