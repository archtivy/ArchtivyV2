"use client";

import type { ExploreRisingSignals } from "@/lib/explore/queries";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

export interface RisingSignalsSectionProps {
  data: ExploreRisingSignals;
  city: string | null;
  onViewAll: (panel: ExplorePanelType) => void;
}

export function RisingSignalsSection({ data, city, onViewAll }: RisingSignalsSectionProps) {
  const viewAllClass = "text-sm font-medium text-[#002abf] hover:underline";

  return (
    <section className="border-t border-[#eeeeee] bg-white py-12" aria-label="Rising signals">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-xl font-normal text-zinc-900">
              Trending Categories
            </h2>
            {data.trendingCategories.length > 0 ? (
              <>
                <ul className="mt-4 space-y-3">
                  {data.trendingCategories.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between rounded border border-[#eeeeee] bg-white px-4 py-3"
                      style={{ borderRadius: 4 }}
                    >
                      <span className="text-sm font-medium text-zinc-900">{c.name}</span>
                      <span className="text-xs font-medium text-[#002abf]">
                        {c.growth > 0 ? `+${c.growth}%` : `${c.growth}%`}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onViewAll("categories")}
                  className={viewAllClass}
                >
                  View All
                </button>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No category data yet.</p>
            )}
          </div>
          <div>
            <h2 className="font-serif text-xl font-normal text-zinc-900">
              Collaboration Density
            </h2>
            <div
              className="mt-4 rounded border border-[#eeeeee] bg-white p-4"
              style={{ borderRadius: 4 }}
            >
              <p className="text-sm text-zinc-900">
                <span className="font-medium">{data.collaborationDensity.avgTeams.toFixed(1)}</span>{" "}
                avg team members per project
              </p>
              {data.collaborationDensity.topCategory && (
                <p className="mt-1 text-xs text-zinc-600">
                  Highest: {data.collaborationDensity.topCategory}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onViewAll("collaboration")}
              className={viewAllClass}
            >
              View All
            </button>
          </div>
        </div>
        {data.trendingMaterials.items.length === 0 && data.trendingMaterials.label && (
          <div className="mt-8 rounded border border-[#eeeeee] bg-zinc-50 px-4 py-3" style={{ borderRadius: 4 }}>
            <p className="text-sm text-zinc-500">{data.trendingMaterials.label}</p>
          </div>
        )}
      </div>
    </section>
  );
}
