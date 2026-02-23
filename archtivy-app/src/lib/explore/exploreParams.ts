/**
 * Query params for /explore: panel type, city filter.
 * Used for slide-over panel state and deep-linking.
 */

export type ExplorePanelType = "designers" | "brands" | "signals" | "market-leaders" | "network-growth" | null;

export interface ExploreParams {
  panel: ExplorePanelType;
  city: string | null;
}

export function parseExploreParams(searchParams: URLSearchParams): ExploreParams {
  const panel = (searchParams.get("panel") ?? "") as ExplorePanelType | "";
  const city = searchParams.get("city")?.trim() ?? null;

  const validPanel =
    panel && ["designers", "brands", "signals", "market-leaders", "network-growth"].includes(panel)
      ? (panel as ExplorePanelType)
      : null;

  return {
    panel: validPanel,
    city,
  };
}

/**
 * Build /explore URL with optional panel and city.
 */
export function buildExploreUrl(params: { panel?: ExplorePanelType; city?: string | null }): string {
  const q = new URLSearchParams();
  if (params.panel) q.set("panel", params.panel);
  if (params.city?.trim()) q.set("city", params.city.trim().toLowerCase().replace(/\s+/g, "-"));
  const s = q.toString();
  return s ? `/explore?${s}` : "/explore";
}
