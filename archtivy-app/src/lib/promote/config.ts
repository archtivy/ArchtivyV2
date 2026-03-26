export type PlacementType = "map_spotlight" | "homepage_feature";
export type DurationDays = 7 | 14 | 30;

export interface PromotionOption {
  placement: PlacementType;
  duration: DurationDays;
  priceCents: number;
}

/** Daily rate in cents per placement. */
const DAILY_RATE_CENTS: Record<PlacementType, number> = {
  homepage_feature: 300, // $3 / day
  map_spotlight: 150,    // $1.50 / day
};

/** Total price = daily rate * duration. */
export function getPrice(placement: PlacementType, duration: DurationDays): number {
  return (DAILY_RATE_CENTS[placement] ?? 0) * duration;
}

/** Daily rate for display (e.g. "$3"). */
export function getDailyRate(placement: PlacementType): string {
  const cents = DAILY_RATE_CENTS[placement] ?? 0;
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(1)}`;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export const PLACEMENT_LABELS: Record<PlacementType, {
  title: string;
  description: string;
  benefits: string[];
}> = {
  map_spotlight: {
    title: "Map Spotlight",
    description: "Get discovered on the Explore map with a highlighted pin.",
    benefits: [
      "Highlighted in the global map view",
      "Visible to designers and brands exploring by location",
      "Increased discovery across geographic searches",
    ],
  },
  homepage_feature: {
    title: "Homepage Feature",
    description: "Feature your listing in the main discovery section on the homepage.",
    benefits: [
      "Shown in the highest-traffic area of the platform",
      "Visible to every visitor on the homepage",
      "Positioned for maximum attention in the editorial feed",
    ],
  },
};

export const DURATION_LABELS: Record<DurationDays, string> = {
  7: "7 days",
  14: "14 days",
  30: "30 days",
};

export const POPULAR_DURATION: DurationDays = 14;
