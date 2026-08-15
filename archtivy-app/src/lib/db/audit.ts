/**
 * Admin audit logging. All admin actions should call createAuditLog.
 *
 * Table: public.audit_logs — created by migration 20260808_audit_logs.
 *   (id, admin_user_id, admin_profile_id, action, entity_type, entity_id,
 *    metadata, created_at)
 *
 * ── WHY THIS FILE CHANGED ───────────────────────────────────────────────────
 * The previous version did `await sup.from("audit_logs").insert(...)` and threw
 * the result away. The table did not exist, so every insert failed with
 * PGRST205 and every one of the 16 call sites carried on as if it had logged.
 * An audit log that silently records nothing is worse than none, because the
 * absence of a record reads as "the action never happened".
 *
 * Two changes fix that:
 *   1. The error is CHECKED and logged loudly, with the action and entity in
 *      the message so a failure is traceable to what was being recorded.
 *   2. The function returns a result. Existing callers that ignore it still
 *      compile — but the failure is no longer invisible, and a caller that
 *      wants to surface it now can.
 *
 * ── WHY IT DOES NOT THROW ───────────────────────────────────────────────────
 * Deliberate. createAuditLog is called AFTER the action it records has already
 * been committed. Throwing would turn "we failed to write a log line" into
 * "the admin sees an error for an operation that actually succeeded", and in
 * several call sites would skip the revalidatePath that follows. Loud, checked,
 * non-fatal is the correct shape here — but "non-fatal" must never again mean
 * "unobserved".
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type AuditAction =
  | "listing.approve"
  | "listing.delete"
  | "listing.bulk_delete"
  | "listing.create"
  | "listing.update"
  | "user.role_update"
  | "user.disable"
  | "user.delete"
  // Admin-authored notifications. A broadcast writes one row per recipient and
  // has no undo, so the send itself is auditable.
  | "notification.send";

export type AuditResult = { ok: true } | { ok: false; error: string };

/**
 * Best-effort Clerk id -> profiles.id. Returns null rather than failing the
 * log write: an admin without a profile row is unusual but not a reason to
 * lose the audit record, and admin_user_id already carries the Clerk id.
 */
async function resolveProfileId(clerkUserId: string): Promise<string | null> {
  if (!clerkUserId) return null;
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function createAuditLog(params: {
  /** Clerk user id, as supplied by every existing call site. */
  adminUserId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AuditResult> {
  const sup = getSupabaseServiceClient();
  const adminProfileId = await resolveProfileId(params.adminUserId);

  const { error } = await sup.from("audit_logs").insert({
    admin_user_id: params.adminUserId,
    admin_profile_id: adminProfileId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    // Loud on purpose. This is the line whose absence hid the bug for as long
    // as it existed. If the table is missing again, this says so on every write.
    console.error(
      `[audit] FAILED to record ${params.action} on ${params.entityType}` +
        `${params.entityId ? ` ${params.entityId}` : ""}: ${error.code ?? "?"} ${error.message}`
    );
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  adminProfileId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Recent audit entries, newest first. This is the event stream the Dashboard's
 * Activity Feed needs — it has no rows until the migration is applied and
 * admin actions start writing, so callers must handle an empty list as the
 * normal early state rather than an error.
 */
export async function getRecentAuditLogs(limit = 25): Promise<AuditLogEntry[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("audit_logs")
    .select("id, admin_user_id, admin_profile_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, limit)));

  if (error) {
    console.error("[audit] read failed:", error.code ?? "?", error.message);
    return [];
  }

  return ((data ?? []) as {
    id: string;
    admin_user_id: string;
    admin_profile_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }[]).map((r) => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    adminProfileId: r.admin_profile_id,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
  }));
}
