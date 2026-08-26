import { Share2 } from "lucide-react";
import type { ConnectionsMapped } from "@/lib/db/connectionsMetric";

/**
 * "N connections mapped" — sits under the hero search.
 *
 * ── UNROUNDED, DELIBERATELY ─────────────────────────────────────────────────
 * The reference mockup read "24,891 connections mapped". The real figure is
 * 233. Rounding it to "250+" or padding it to look like the mockup would be
 * the same fabrication in a smaller font, so this prints exactly what
 * getConnectionsMapped counted. Same rule HeroStatPanel already follows.
 *
 * Renders NOTHING at zero rather than announcing an empty graph — matching how
 * HeroStatPanel drops zero-valued rows instead of showing "0".
 *
 * The singular case is handled because at this scale it is reachable: a fresh
 * environment with one credit would otherwise read "1 connections mapped".
 */

const NUMBER = new Intl.NumberFormat("en-US");

export function HeroConnectionMetric({ connections }: { connections: ConnectionsMapped }) {
  if (connections.total <= 0) return null;

  return (
    <p className="mt-6 flex items-center gap-2.5 font-body text-[13px] leading-[18px] text-cream/70">
      <Share2 strokeWidth={1.5} className="h-4 w-4 shrink-0 text-cream/50" aria-hidden />
      <span>
        <span className="font-medium text-cream">{NUMBER.format(connections.total)}</span>{" "}
        {connections.total === 1 ? "connection" : "connections"} mapped
      </span>
    </p>
  );
}
