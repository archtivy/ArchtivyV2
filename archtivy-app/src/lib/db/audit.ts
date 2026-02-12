/**
 * Admin audit logging. All admin actions should call createAuditLog.
 * Table: public.audit_logs (id, admin_user_id, action, entity_type, entity_id, metadata, created_at)
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type AuditAction =
  | "listing.delete"
  | "listing.bulk_delete"
  | "listing.create"
  | "listing.update"
  | "user.role_update"
  | "user.disable"
  | "user.delete";

export async function createAuditLog(params: {
  adminUserId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sup = getSupabaseServiceClient();
  await sup.from("audit_logs").insert({
    admin_user_id: params.adminUserId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    metadata: params.metadata ?? {},
  });
}
