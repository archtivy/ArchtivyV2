export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ExploreMapView } from "@/components/explore/ExploreMapView";

/**
 * Premium Explore Map: map + cards discovery.
 * Map shows projects and profiles (designers/brands); products appear via "Used here" later.
 */
export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <ExploreMapView />
    </div>
  );
}
