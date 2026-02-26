"use client";

import type { ExploreRisingSignals } from "@/lib/explore/queries";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

export interface RisingSignalsSectionProps {
  data: ExploreRisingSignals;
  city: string | null;
  onViewAll: (panel: ExplorePanelType) => void;
}

export function RisingSignalsSection({ data, onViewAll }: RisingSignalsSectionProps) {
  if (data.trendingCategories.length === 0) return null;

  return (
    <section className="border-t border-[#eeeeee] bg-white py-12" aria-label="Rising signals">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <p className="mb-8 text-xs font-medium uppercase tracking-widest text-zinc-400">
          Rising Signals
        </p>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-normal text-zinc-900">Trending Categories</h2>
            <ul className="mt-5 space-y-2">
              {data.trendingCategories.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded border border-[#eeeeee] bg-white px-4 py-3"
                >
                  <span className="text-sm font-medium text-zinc-900">{c.name}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-[#002abf]">
                    {c.growth > 0 ? `+${c.growth}%` : `${c.growth}%`}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onViewAll("categories")}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#002abf] transition-all hover:gap-2"
            >
              View all <span aria-hidden>→</span>
            </button>
          </div>

          {data.trendingMaterials.items.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl font-normal text-zinc-900">Trending Materials</h2>
              <ul className="mt-5 space-y-2">
                {data.trendingMaterials.items.map((item, i) => (
                  <li
                    key={i}
                    className="rounded border border-[#eeeeee] bg-white px-4 py-3 text-sm font-medium text-zinc-900"
                  >
                    {String(item)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
