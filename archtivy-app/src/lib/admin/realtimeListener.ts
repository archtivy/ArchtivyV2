"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAdminInvalidate } from "@/lib/admin/hooks";

export type RealtimeStatus = "live" | "connecting" | "error";

const TABLES_TO_CHANNELS: Array<{
  table: string;
  invalidate: keyof ReturnType<typeof useAdminInvalidate>;
}> = [
  { table: "profiles", invalidate: "invalidateProfiles" },
  { table: "listings", invalidate: "invalidateProjects" }, // covers projects + products
  { table: "project_product_links", invalidate: "invalidateProjects" },
  { table: "listing_images", invalidate: "invalidateProjects" },
  { table: "featured_slots", invalidate: "invalidateFeatured" },
  { table: "sponsor_slots", invalidate: "invalidateFeatured" },
  { table: "listing_materials", invalidate: "invalidateTaxonomies" },
];

/**
 * Subscribes to Supabase Realtime for all admin-relevant tables.
 * On any INSERT/UPDATE/DELETE, invalidates the relevant React Query caches.
 * Also triggers a dashboard invalidation on any change (to keep counts fresh).
 *
 * Returns the current realtime connection status and last sync time.
 */
export function useAdminRealtime(): {
  status: RealtimeStatus;
  lastSync: Date | null;
} {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const invalidate = useAdminInvalidate();
  const channelsRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]>[]>([]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus("error");
      return;
    }

    const client = createClient(supabaseUrl, supabaseAnonKey);

    const channels = TABLES_TO_CHANNELS.map(({ table, invalidate: inv }) => {
      const channel = client
        .channel(`admin-${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            setLastSync(new Date());
            setStatus("live");
            // Invalidate the specific table's queries
            invalidate[inv]();
            // Always refresh dashboard counts
            invalidate.invalidateDashboard();
            // Refresh SEO if listings changed
            if (table === "listings" || table === "listing_images") {
              invalidate.invalidateSeo();
            }
          }
        )
        .subscribe((s) => {
          if (s === "SUBSCRIBED") {
            setStatus("live");
            setLastSync(new Date());
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
            setStatus("error");
          } else if (s === "CLOSED") {
            setStatus("connecting");
          }
        });

      return channel;
    });

    channelsRef.current = channels;

    return () => {
      channels.forEach((ch) => ch.unsubscribe());
      channelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, lastSync };
}
