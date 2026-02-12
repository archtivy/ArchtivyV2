import type { ReactNode } from "react";

/**
 * Returns display string for connection count: "1 connection" | "N connections" | null.
 * Returns null when count is missing, null, undefined, NaN, or <= 0.
 * Use for cards and anywhere we must never show "Not specified" or "0 connections".
 */
export function formatConnections(count: unknown): string | null {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n} ${n === 1 ? "connection" : "connections"}`;
}

/**
 * Returns display string for connection count: "1 connection" | "N connections" | "".
 * Returns "" when count is missing, null, undefined, NaN, or <= 0.
 */
export function connectionsLabelText(count: unknown): string {
  const s = formatConnections(count);
  return s ?? "";
}

/**
 * Renders connection count as a span or nothing. Use wherever connections are displayed.
 * Never shows "Not specified" or "0 connections".
 */
export function ConnectionsLabel({
  count,
  className,
}: {
  count: unknown;
  className?: string;
}): ReactNode {
  const text = formatConnections(count);
  if (text == null) return null;
  return <span className={className ?? ""}>{text}</span>;
}
