"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExploreIntelligenceHero } from "./ExploreIntelligenceHero";
import { LiveSignalStrip } from "./LiveSignalStrip";
import { IntelligenceModules } from "./IntelligenceModules";
import { SlideOverPanel } from "./SlideOverPanel";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

const PANEL_TITLES: Record<NonNullable<ExplorePanelType>, string> = {
  designers: "24 Designers in Los Angeles",
  brands: "Strategic Brands",
  signals: "Rising Signals",
  "market-leaders": "Market Leaders",
  "network-growth": "Designers aligned with your interests",
};

const PANEL_SUBTEXTS: Partial<Record<NonNullable<ExplorePanelType>, string>> = {
  designers: "Filtered by Residential + Natural Stone",
  brands: "Brands with highest project integration",
  signals: "Materials and categories with strongest growth",
  "market-leaders": "Top designers by collaboration score",
  "network-growth": "Based on your selected interests",
};

export function ExploreIntelligenceLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const panel = (searchParams.get("panel") ?? "") as ExplorePanelType | "";
  const city = searchParams.get("city") ?? null;
  const open =
    !!panel &&
    ["designers", "brands", "signals", "market-leaders", "network-growth"].includes(panel);

  const title = open && panel in PANEL_TITLES ? PANEL_TITLES[panel as keyof typeof PANEL_TITLES] : "Results";
  const subtext = open && panel in PANEL_SUBTEXTS ? PANEL_SUBTEXTS[panel] : undefined;

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

  const cityDisplay = city?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Los Angeles";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fafafa" }}>
      <div className={open ? "opacity-[0.94]" : ""}>
        <ExploreIntelligenceHero />
        <LiveSignalStrip />
        <IntelligenceModules city={city} onViewAll={openPanel} />
      </div>

      <SlideOverPanel
        open={open}
        title={panel === "designers" ? `24 Designers in ${cityDisplay}` : title}
        subtext={subtext}
        onClose={closePanel}
      >
        {null}
      </SlideOverPanel>
    </div>
  );
}
