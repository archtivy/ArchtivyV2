export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import { ExploreIntelligenceLayout } from "@/components/explore/ExploreIntelligenceLayout";

/**
 * Premium Explore Intelligence: mapless editorial layout.
 * Hero, Live Signal Strip, 2-column Intelligence Modules, slide-over panel.
 */
export default function ExplorePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-zinc-500">Loading…</div>}>
        <ExploreIntelligenceLayout />
      </Suspense>
    </div>
  );
}
