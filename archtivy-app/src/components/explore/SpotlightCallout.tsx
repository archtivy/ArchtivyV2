"use client";

import { useEffect, useState } from "react";
import type { MapPin } from "./ExploreMapView";

/* ═══════════════════════════════════════════════════════════════════════════
   SpotlightCallout — premium mini card anchored to the featured pin
   ═══════════════════════════════════════════════════════════════════════════ */

interface SpotlightCalloutProps {
  pin: MapPin;
  /** Screen position of the pin, updated on map move */
  position: { x: number; y: number } | null;
  visible: boolean;
  onClick: () => void;
}

export function SpotlightCallout({ pin, position, visible, onClick }: SpotlightCalloutProps) {
  const [entered, setEntered] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!visible) { setEntered(false); return; }
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, [visible]);

  if (!position || !visible) return null;

  // Position the callout above and to the right of the pin
  const cardW = 220;
  const offsetX = 18;
  const offsetY = -12;

  return (
    <div
      className="pointer-events-auto absolute z-20"
      style={{
        left: position.x + offsetX,
        top: position.y + offsetY,
        width: cardW,
        transform: "translateY(-100%)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
        opacity: entered ? 1 : 0,
      }}
    >
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full text-left"
      >
        <div
          className="overflow-hidden rounded-lg transition-shadow duration-300"
          style={{
            background: hovered ? "rgba(255, 255, 255, 0.88)" : "rgba(255, 255, 255, 0.78)",
            backdropFilter: "blur(20px) saturate(1.2)",
            WebkitBackdropFilter: "blur(20px) saturate(1.2)",
            border: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow: hovered
              ? "0 4px 20px -4px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.04)"
              : "0 2px 12px -4px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.03)",
          }}
        >
          {/* Gold accent line */}
          <div
            className="h-px"
            style={{
              background: "linear-gradient(to right, rgba(180, 140, 40, 0.5), rgba(180, 140, 40, 0.15), transparent)",
            }}
          />

          <div className="flex gap-2.5 p-2">
            {/* Thumbnail */}
            {pin.imageUrl ? (
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-zinc-100">
                <img
                  src={pin.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            ) : (
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-zinc-50/80">
                <svg className="h-4 w-4 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="1" />
                  <path d="M3 16.5l5-5 4 4 3-3 6 6" strokeLinejoin="round" />
                </svg>
              </div>
            )}

            {/* Text */}
            <div className="min-w-0 flex-1 py-0.5">
              <div
                className="text-[8px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "rgba(160, 125, 30, 0.75)" }}
              >
                Project of the Day
              </div>
              <div className="mt-0.5 truncate text-[12px] font-medium leading-tight text-zinc-900">
                {pin.title}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-zinc-500/80">
                {pin.locationLabel}
                {pin.year && <span className="text-zinc-400"> · {pin.year}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Connecting line to pin */}
        <div
          className="absolute -bottom-2 -left-2"
          style={{
            width: 20,
            height: 20,
            pointerEvents: "none",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M18 2 Q10 2 4 12 L2 18"
              stroke="rgba(160, 125, 30, 0.2)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      </button>
    </div>
  );
}
