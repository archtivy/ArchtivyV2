"use client";

import { useEffect, useState } from "react";
import type { MapPin } from "./ExploreMapView";

type SpotlightType = "project" | "brand" | "designer";

const TYPE_LABELS: Record<SpotlightType, string> = {
  project: "PROJECT",
  brand: "BRAND",
  designer: "DESIGNER",
};

interface SpotlightCalloutProps {
  pin: MapPin;
  visible: boolean;
  onClick: () => void;
}

export function SpotlightCallout({ pin, visible, onClick }: SpotlightCalloutProps) {
  const [entered, setEntered] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, [visible]);

  // Reset entrance when pin changes
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, [pin.id]);

  if (!visible) return null;

  const spotType = pin.type as SpotlightType;
  const typeLabel = TYPE_LABELS[spotType] ?? "PROJECT";

  // Build subtitle
  let subtitle = pin.locationLabel || "";
  if (spotType === "project" && pin.year) {
    subtitle = [pin.locationLabel, pin.year].filter(Boolean).join(" · ");
  }

  return (
    <div
      className="pointer-events-auto absolute right-4 z-20 sm:right-6"
      style={{
        top: 80,
        width: 260,
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
        opacity: entered ? 1 : 0,
        transform: `translateY(${entered ? "0" : "6px"})`,
      }}
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full text-left"
      >
        <div
          className="overflow-hidden transition-shadow duration-200"
          style={{
            background: hovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.90)",
            backdropFilter: "blur(20px) saturate(1.2)",
            WebkitBackdropFilter: "blur(20px) saturate(1.2)",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 6,
            boxShadow: hovered
              ? "0 6px 20px -4px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04)"
              : "0 3px 14px -4px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div className="p-3">
            {/* Type label */}
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {typeLabel}
            </span>

            {/* Content */}
            <div className="mt-1.5 flex gap-2.5">
              {pin.imageUrl ? (
                <div className="h-11 w-[60px] shrink-0 overflow-hidden bg-zinc-100" style={{ borderRadius: 3 }}>
                  <img src={pin.imageUrl} alt="" className="h-full w-full object-cover" loading="eager" />
                </div>
              ) : (
                <div className="flex h-11 w-[60px] shrink-0 items-center justify-center bg-zinc-100" style={{ borderRadius: 3 }}>
                  <span className="text-[10px] text-zinc-300">
                    {spotType === "project" ? "P" : spotType === "brand" ? "B" : "D"}
                  </span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium leading-tight text-zinc-900">
                  {pin.title}
                </div>
                {subtitle && (
                  <div className="mt-0.5 truncate text-[11px] text-zinc-400">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
