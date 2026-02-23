"use client";

import type { ExplorePanelType } from "@/lib/explore/exploreParams";

const ACCENT = "#002abf";

const MARKET_LEADERS = [
  { name: "Luna Architects", score: "8.4", projectsCount: 6, brands: ["Atelier Materials", "Studio North", "Urban Form"] },
  { name: "Atelier Design Studio", score: "7.9", projectsCount: 5, brands: ["Material Space", "Landscape Praxis"] },
];

const NETWORK_GROWTH = [
  { name: "Luna Architects", match: 92, tags: ["Residential", "Natural Stone"] },
  { name: "Atelier Design Studio", match: 78, tags: ["Commercial", "Timber"] },
  { name: "Urban Form Collective", match: 74, tags: ["Hospitality", "Concrete"] },
];

const STRATEGIC_BRANDS = [
  { name: "Atelier Materials", projectsCount: 14, designersCount: 9 },
  { name: "Studio North", projectsCount: 11, designersCount: 7 },
];

const RISING_SIGNALS = [
  { name: "Natural Stone", growth: "+32%", projectsCount: 18 },
  { name: "Courtyard Houses", growth: "+28%", projectsCount: 12 },
];

export interface IntelligenceModulesProps {
  city?: string | null;
  onViewAll: (panel: ExplorePanelType) => void;
}

export function IntelligenceModules({ city, onViewAll }: IntelligenceModulesProps) {
  const viewAllClass = "text-sm font-medium text-[#002abf] hover:underline";

  const placeholders = Array(3).fill(null).map((_, i) => (
    <div
      key={i}
      className="h-12 w-16 shrink-0 rounded bg-zinc-100"
      style={{ borderRadius: 4 }}
      aria-hidden
    />
  ));

  return (
    <section className="border-t border-[#eeeeee] py-12" aria-label="Intelligence modules">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-10">
            {/* A) Market Leaders */}
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Market Leaders</h2>
              <ul className="mt-4 space-y-4">
                {MARKET_LEADERS.map((d, i) => (
                  <li
                    key={i}
                    className="rounded border border-[#eeeeee] bg-white p-4"
                    style={{ borderRadius: 4 }}
                  >
                    <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">Collaboration Score {d.score}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Appears in {d.projectsCount} multi-team projects
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="flex gap-1">{placeholders}</div>
                      <span className="text-xs text-zinc-400">|</span>
                      <span className="text-xs text-zinc-500">
                        {d.brands.join(" · ")}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onViewAll("market-leaders")}
                className={viewAllClass}
              >
                View All
              </button>
            </div>

            {/* B) Network Growth */}
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">
                Designers aligned with your interests
              </h2>
              <ul className="mt-4 space-y-3">
                {NETWORK_GROWTH.map((d, i) => (
                  <li
                    key={i}
                    className="rounded border border-[#eeeeee] bg-white px-4 py-3"
                    style={{ borderRadius: 4 }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                      <span className="text-xs font-medium text-[#002abf]">Match {d.match}%</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {d.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600"
                          style={{ borderRadius: 4 }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onViewAll("network-growth")}
                className={viewAllClass}
              >
                View All
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-10">
            {/* C) Strategic Brands */}
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Strategic Brands</h2>
              <ul className="mt-4 space-y-4">
                {STRATEGIC_BRANDS.map((b, i) => (
                  <li
                    key={i}
                    className="rounded border border-[#eeeeee] bg-white p-4"
                    style={{ borderRadius: 4 }}
                  >
                    <p className="text-sm font-medium text-zinc-900">{b.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-600">Used in {b.projectsCount} projects</p>
                    <p className="text-xs text-zinc-500">Connected to {b.designersCount} designers</p>
                    <div className="mt-3 flex gap-1">{placeholders}</div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onViewAll("brands")}
                className={viewAllClass}
              >
                View All
              </button>
            </div>

            {/* D) Rising Signals */}
            <div>
              <h2 className="font-serif text-xl font-normal text-zinc-900">Rising Signals</h2>
              <ul className="mt-4 space-y-4">
                {RISING_SIGNALS.map((s, i) => (
                  <li
                    key={i}
                    className="rounded border border-[#eeeeee] bg-white p-4"
                    style={{ borderRadius: 4 }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                      <span className="text-xs font-medium text-[#002abf]">{s.growth} growth</span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Appears in {s.projectsCount} projects
                    </p>
                    <div className="mt-3 flex gap-1">{placeholders}</div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onViewAll("signals")}
                className={viewAllClass}
              >
                View All
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
