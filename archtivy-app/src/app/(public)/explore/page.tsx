export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import {
  getExploreSignalsCached,
  getExploreModulesCached,
  getExploreRisingSignalsCached,
} from "@/lib/explore/queries";
import { ExploreIntelligenceLayout } from "@/components/explore/ExploreIntelligenceLayout";

/**
 * Premium Explore Intelligence: mapless editorial layout.
 * Hero, Live Signal Strip, 2-column Intelligence Modules, Rising Signals, slide-over panel.
 * All data from Supabase (no placeholders).
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const city = typeof params.city === "string" ? params.city.trim() || null : null;

  const [signals, modules, risingSignals] = await Promise.all([
    getExploreSignalsCached(city),
    getExploreModulesCached(city, 5),
    getExploreRisingSignalsCached(city, 5),
  ]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center text-zinc-500">
            Loading…
          </div>
        }
      >
        <ExploreIntelligenceLayout
          signals={signals}
          modules={modules}
          risingSignals={risingSignals}
          city={city}
        />
      </Suspense>
    </div>
  );
}
