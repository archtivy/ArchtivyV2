"use client";

import { useState } from "react";
import type { ImageRegionMarker } from "@/lib/db/gallery";

interface ImageHotspotsOverlayProps {
  regions: ImageRegionMarker[];
  onSelectRegion: (region: ImageRegionMarker) => void;
  activeRegionId?: string | null;
}

/**
 * Renders subtle hotspot markers over an image at detected product positions.
 * Each marker is a small pulsing dot that can be tapped/clicked to reveal product info.
 */
export function ImageHotspotsOverlay({
  regions,
  onSelectRegion,
  activeRegionId,
}: ImageHotspotsOverlayProps) {
  if (!regions.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {regions.map((region) => {
        const isActive = activeRegionId === region.id;
        return (
          <HotspotButton
            key={region.id}
            region={region}
            active={isActive}
            onClick={() => onSelectRegion(region)}
          />
        );
      })}
    </div>
  );
}

function HotspotButton({
  region,
  active,
  onClick,
}: {
  region: ImageRegionMarker;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto absolute z-10 flex items-center justify-center focus:outline-none"
      style={{
        left: `${region.x}%`,
        top: `${region.y}%`,
        transform: "translate(-50%, -50%)",
        width: 28,
        height: 28,
      }}
      aria-label={`View ${region.label}`}
    >
      {/* Outer pulse ring — visible on hover or when active */}
      <span
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          active || hovered ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
        }}
      />

      {/* Inner dot */}
      <span
        className={`relative rounded-full transition-all duration-200 ${
          active
            ? "h-3 w-3 bg-white shadow-md"
            : hovered
              ? "h-2.5 w-2.5 bg-white/90 shadow-sm"
              : "h-2 w-2 bg-white/70"
        }`}
        style={{
          boxShadow: active
            ? "0 0 8px rgba(255,255,255,0.4), 0 0 2px rgba(0,0,0,0.2)"
            : hovered
              ? "0 0 4px rgba(255,255,255,0.3)"
              : "0 0 3px rgba(0,0,0,0.2)",
        }}
      />

      {/* Label tooltip — shown on hover, hidden on mobile */}
      {hovered && !active && (
        <span
          className="absolute left-full top-1/2 ml-2 hidden -translate-y-1/2 whitespace-nowrap sm:block"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.9)",
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 8px",
            borderRadius: 4,
          }}
        >
          {region.label}
        </span>
      )}
    </button>
  );
}
