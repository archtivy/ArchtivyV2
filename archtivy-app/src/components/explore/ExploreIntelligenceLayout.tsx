"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreIntelligenceHero } from "./ExploreIntelligenceHero";
import { LiveSignalStrip } from "./LiveSignalStrip";
import { IntelligenceModules } from "./IntelligenceModules";
import { RisingSignalsSection } from "./RisingSignalsSection";
import { SlideOverPanel } from "./SlideOverPanel";
import type { ExploreSignal } from "@/lib/explore/queries";
import type { ExploreModules } from "@/lib/explore/queries";
import type { ExploreRisingSignals } from "@/lib/explore/queries";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

const PANEL_TITLES: Record<string, string> = {
  designers: "Designers",
  brands: "Strategic Brands",
  signals: "Rising Signals",
  projects: "Top Projects",
  products: "Product Leaders",
  categories: "Trending Categories",
  collaboration: "Collaboration Density",
  "market-leaders": "Market Leaders",
  "network-growth": "Designers aligned with your interests",
};

const PANEL_SUBTEXTS: Record<string, string> = {
  designers: "Top designers by collaboration score",
  brands: "Brands with highest project integration",
  signals: "Materials and categories with strongest growth",
  projects: "Most viewed projects",
  products: "Products used in the most projects",
  categories: "Categories by project count and growth",
  collaboration: "Categories ranked by avg team members",
  "market-leaders": "Top designers by collaboration score",
  "network-growth": "Based on your selected interests",
};

export interface ExploreIntelligenceLayoutProps {
  signals: ExploreSignal[];
  modules: ExploreModules;
  risingSignals: ExploreRisingSignals;
  city: string | null;
}

export function ExploreIntelligenceLayout({
  signals,
  modules,
  risingSignals,
  city,
}: ExploreIntelligenceLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const panel = (searchParams.get("panel") ?? "") as string;
  const validPanels = [
    "designers",
    "brands",
    "signals",
    "projects",
    "products",
    "categories",
    "collaboration",
    "market-leaders",
    "network-growth",
  ];
  const open = !!panel && validPanels.includes(panel);

  const title =
    city && ["designers", "market-leaders", "network-growth"].includes(panel)
      ? `${PANEL_TITLES[panel] ?? "Results"} in ${city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
      : (PANEL_TITLES[panel] ?? "Results");
  const subtext = PANEL_SUBTEXTS[panel];

  const openPanel = useCallback(
    (p: ExplorePanelType) => {
      const q = new URLSearchParams(searchParams.toString());
      if (p) q.set("panel", p);
      else q.delete("panel");
      if (city) q.set("city", city);
      router.push(`/explore?${q.toString()}`);
    },
    [router, searchParams, city]
  );

  const closePanel = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("panel");
    const str = q.toString();
    router.push(str ? `/explore?${str}` : "/explore");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <div className={open ? "opacity-[0.94]" : ""}>
        <ExploreIntelligenceHero />
        <LiveSignalStrip signals={signals} />
        <IntelligenceModules modules={modules} city={city} onViewAll={openPanel} />
        <RisingSignalsSection data={risingSignals} city={city} onViewAll={openPanel} />
      </div>

      <SlideOverPanel
        open={open}
        panel={panel || null}
        title={title}
        subtext={subtext}
        city={city}
        onClose={closePanel}
      />
    </div>
  );
}
