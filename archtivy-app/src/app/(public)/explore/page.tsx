// No cache — this page always fetches fresh data on every request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getExploreIntelligence } from "@/lib/db/intelligence";
import { LiveSignalsStrip } from "@/components/explore/LiveSignalsStrip";
import { IntelligencePanel } from "@/components/explore/IntelligencePanel";
import type { PanelRole } from "@/components/explore/IntelligencePanel";

export default async function ExplorePage() {
  // ── Role detection (non-blocking: visitor if unauthenticated or on error) ──
  let role: PanelRole = "visitor";
  const { userId } = await auth();
  if (userId) {
    const { data: profile } = await getProfileByClerkId(userId);
    if (profile?.role === "designer" || profile?.role === "admin") {
      role = "designer";
    } else if (profile?.role === "brand") {
      role = "brand";
    }
  }

  // ── Single parallel fetch — all 7 RPCs ────────────────────────────────────
  const intel = await getExploreIntelligence();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      {/* ── Live signals strip ─────────────────────────────────────────────── */}
      <LiveSignalsStrip signals={intel.liveSignals} />

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pb-2 pt-8 sm:px-6">
        <h1
          className="font-serif text-xl font-semibold text-zinc-900 sm:text-2xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Architecture Network Intelligence
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Real-time market signals from the architecture network.
        </p>
      </div>

      {/* ── Main 2-column grid ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">

          {/* Left column — Network Map (placeholder) */}
          <div
            className="flex min-h-[300px] flex-col items-center justify-center rounded-[4px] border border-zinc-100 bg-white lg:min-h-[560px]"
            aria-label="Network Map"
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "#002abf" }}
            >
              Network Map
            </span>
            <p className="mt-2 max-w-[220px] text-center text-[12px] text-zinc-400">
              Geographic intelligence — coming soon
            </p>
          </div>

          {/* Right column — Intelligence Panel */}
          <IntelligencePanel data={intel} role={role} />

        </div>
      </div>
    </div>
  );
}
