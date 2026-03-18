"use client";

import type { MapPin, PinType } from "./ExploreMapView";

const COLORS: Record<PinType, string> = {
  project: "#002abf",
  product: "#059669",
  designer: "#7c3aed",
  brand: "#d4a017",
};

const LABELS: Record<PinType, string> = {
  project: "Project",
  product: "Product",
  designer: "Designer",
  brand: "Brand",
};

interface MapPinPreviewProps {
  pin: MapPin;
  position: { x: number; y: number };
  containerRect: DOMRect | null;
}

export function MapPinPreview({ pin, position, containerRect }: MapPinPreviewProps) {
  if (!containerRect) return null;

  const cardW = 280;
  const cardH = pin.imageUrl ? 220 : 110;
  const offset = 16;

  let top = position.y - cardH - offset;
  let left = position.x - cardW / 2;
  const flipBelow = top < 8;
  if (flipBelow) top = position.y + offset;

  if (left < 8) left = 8;
  if (left + cardW > containerRect.width - 8) left = containerRect.width - cardW - 8;

  const color = COLORS[pin.type];

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        top,
        left,
        width: cardW,
        animation: "pin-preview-in 0.15s ease-out",
      }}
    >
      <div className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-zinc-200/60">
        {/* Image */}
        {pin.imageUrl && (
          <div className="relative h-[130px] w-full overflow-hidden bg-zinc-100">
            <img
              src={pin.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {/* Type badge */}
            <div className="absolute left-2.5 top-2.5">
              <span
                className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                style={{ background: color }}
              >
                {LABELS[pin.type]}
              </span>
            </div>
          </div>
        )}
        {/* Content */}
        <div className="px-3.5 py-3">
          {!pin.imageUrl && (
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
                {LABELS[pin.type]}
              </span>
            </div>
          )}
          <div className="truncate text-[13px] font-semibold text-zinc-900">
            {pin.title}
          </div>
          {/* Owner / architect */}
          {pin.ownerName && (
            <div className="mt-0.5 truncate text-xs text-zinc-500">
              {pin.type === "project" ? "by " : ""}{pin.ownerName}
            </div>
          )}
          {/* Location + year row */}
          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
            {pin.locationLabel && (
              <span className="flex items-center gap-1 truncate">
                <svg className="h-3 w-3 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                </svg>
                {pin.locationLabel}
              </span>
            )}
            {pin.year && (
              <span className="shrink-0 text-zinc-400">{pin.year}</span>
            )}
          </div>
          {/* Category chip */}
          {pin.category && (
            <div className="mt-2">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                {pin.category}
              </span>
            </div>
          )}
          {/* CTA hint */}
          <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#002abf]">
            Click to explore
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div className={`absolute left-1/2 -translate-x-1/2 ${flipBelow ? "-top-1.5" : "-bottom-1.5"}`}>
        <div className={`h-3 w-3 rotate-45 bg-white ring-1 ring-zinc-200/60 ${flipBelow ? "shadow-none" : "shadow-sm"}`} />
      </div>
    </div>
  );
}
