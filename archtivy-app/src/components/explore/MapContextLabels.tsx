"use client";

import { useMemo } from "react";
import type { MapPin } from "./ExploreMapView";

/**
 * Regional context labels for the explore map.
 * Computes up to 3 regional insights from pin data and renders them as
 * subtle floating text that feels like part of the cartographic layer.
 */

interface RegionLabel {
  text: string;
  /** Approximate screen position as percentage from top-left. */
  top: string;
  left: string;
}

/** Rough continent/region from lat/lng. */
function classifyRegion(lat: number, lng: number): string | null {
  if (lat > 35 && lat < 72 && lng > -25 && lng < 40) return "Europe";
  if (lat > 24 && lat < 50 && lng > -130 && lng < -60) return "North America";
  if (lat > -60 && lat < 15 && lng > -85 && lng < -30) return "South America";
  if (lat > 0 && lat < 45 && lng > 60 && lng < 150) return "Asia";
  if (lat > 25 && lat < 45 && lng > 25 && lng < 60) return "Middle East";
  if (lat > -45 && lat < 40 && lng > -20 && lng < 55) return "Africa";
  if (lat > -50 && lat < 0 && lng > 110 && lng < 180) return "Oceania";
  return null;
}

/** Region → approximate label position on an equirectangular world view. */
const REGION_POSITIONS: Record<string, { top: string; left: string }> = {
  "Europe":        { top: "22%", left: "52%" },
  "North America": { top: "28%", left: "22%" },
  "South America": { top: "58%", left: "30%" },
  "Asia":          { top: "32%", left: "72%" },
  "Middle East":   { top: "36%", left: "58%" },
  "Africa":        { top: "48%", left: "52%" },
  "Oceania":       { top: "62%", left: "80%" },
};

interface MapContextLabelsProps {
  pins: MapPin[];
  recentPins: MapPin[];
  visible: boolean;
}

export function MapContextLabels({ pins, recentPins, visible }: MapContextLabelsProps) {
  const labels = useMemo(() => {
    // Count projects per region
    const regionCounts = new Map<string, number>();
    const projectPins = pins.filter((p) => p.type === "project");
    for (const pin of projectPins) {
      const region = classifyRegion(pin.lat, pin.lng);
      if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
    }

    // Count recent per country (from recentPins)
    const recentByCountry = new Map<string, number>();
    for (const pin of recentPins) {
      const country = pin.locationLabel?.split(",").pop()?.trim();
      if (country) recentByCountry.set(country, (recentByCountry.get(country) ?? 0) + 1);
    }

    const result: RegionLabel[] = [];

    // Top region by count
    const sorted = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted[0] && sorted[0][1] >= 3) {
      const [region, count] = sorted[0];
      const pos = REGION_POSITIONS[region];
      if (pos) result.push({ text: `${count} projects in ${region}`, ...pos });
    }

    // Trending country from recent
    const recentSorted = Array.from(recentByCountry.entries()).sort((a, b) => b[1] - a[1]);
    if (recentSorted[0] && recentSorted[0][1] >= 2) {
      const [country] = recentSorted[0];
      // Find approximate position from a pin in that country
      const pin = recentPins.find((p) => p.locationLabel?.includes(country));
      if (pin) {
        const region = classifyRegion(pin.lat, pin.lng);
        // Avoid overlapping with the first label
        if (region && region !== sorted[0]?.[0]) {
          const pos = REGION_POSITIONS[region];
          if (pos) result.push({ text: `Trending in ${country}`, ...pos });
        }
      }
    }

    // Second region if we have room
    if (result.length < 2 && sorted[1] && sorted[1][1] >= 2) {
      const [region, count] = sorted[1];
      const pos = REGION_POSITIONS[region];
      if (pos) result.push({ text: `${count} projects in ${region}`, ...pos });
    }

    return result.slice(0, 3);
  }, [pins, recentPins]);

  if (!visible || labels.length === 0) return null;

  return (
    <>
      {labels.map((label, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-[5] select-none"
          style={{
            top: label.top,
            left: label.left,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span
            className="text-[12px] font-medium tracking-wide"
            style={{
              color: "rgba(100, 100, 100, 0.35)",
              textShadow: "0 0 8px rgba(255, 255, 255, 0.6)",
            }}
          >
            {label.text}
          </span>
        </div>
      ))}
    </>
  );
}
