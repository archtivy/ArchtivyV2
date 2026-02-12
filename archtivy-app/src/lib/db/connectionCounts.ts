/**
 * Connection counts from public.connections.
 * Schema: from_type, from_id, to_type, to_id (no listing_id).
 * For an entity (type, id), count = rows where (from_type=type AND from_id=id) OR (to_type=type AND to_id=id).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const TABLE = "connections";

/**
 * Get total connection count per entity id.
 * Counts rows where from_type=type and from_id in ids, plus rows where to_type=type and to_id in ids,
 * then sums both for each id.
 */
export async function getConnectionCounts(
  type: string,
  ids: string[]
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};

  const sup = getSupabaseServiceClient();

  const [fromResult, toResult] = await Promise.all([
    sup
      .from(TABLE)
      .select("from_id")
      .eq("from_type", type)
      .in("from_id", ids),
    sup
      .from(TABLE)
      .select("to_id")
      .eq("to_type", type)
      .in("to_id", ids),
  ]);

  const map: Record<string, number> = {};
  for (const id of ids) {
    map[id] = 0;
  }

  const fromRows = (fromResult.data ?? []) as { from_id: string }[];
  for (const r of fromRows) {
    if (r.from_id && map[r.from_id] !== undefined) {
      map[r.from_id]++;
    }
  }

  const toRows = (toResult.data ?? []) as { to_id: string }[];
  for (const r of toRows) {
    if (r.to_id && map[r.to_id] !== undefined) {
      map[r.to_id]++;
    }
  }

  return map;
}
