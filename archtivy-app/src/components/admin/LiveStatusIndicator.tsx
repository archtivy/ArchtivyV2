"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminRealtime, type RealtimeStatus } from "@/lib/admin/realtimeListener";

function formatSince(d: Date | null): string {
  if (!d) return "—";
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

const DOT: Record<RealtimeStatus, string> = {
  live: "bg-emerald-500",
  connecting: "bg-amber-400 animate-pulse",
  error: "bg-red-500",
};

const LABEL: Record<RealtimeStatus, string> = {
  live: "Live",
  connecting: "Reconnecting...",
  error: "Disconnected",
};

/**
 * Compact live status indicator for the admin sidebar/header.
 * Shows connection state + last sync time, updates every second.
 */
export function LiveStatusIndicator() {
  const { status, lastSync } = useAdminRealtime();
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="flex items-center gap-1.5 rounded px-2 py-1 text-xs" aria-live="polite" title={`Last sync: ${formatSince(lastSync)}`}>
      <span className={["inline-block h-2 w-2 rounded-full", DOT[status]].join(" ")} />
      <span className="font-medium text-zinc-600">{LABEL[status]}</span>
      {status === "live" && lastSync && (
        <span className="text-zinc-400">· {formatSince(lastSync)}</span>
      )}
    </div>
  );
}
