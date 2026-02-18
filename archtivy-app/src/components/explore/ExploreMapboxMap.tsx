"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import * as React from "react";
import type { ExploreMapItem } from "@/lib/explore-map/types";
import { exploreItemKey, getItemLatLng } from "@/lib/explore-map/types";

const DEFAULT_CENTER: [number, number] = [-118.2437, 34.0522]; // Los Angeles
const DEFAULT_ZOOM = 9;

export interface ExploreMapboxMapProps {
  /** Mapbox access token (NEXT_PUBLIC_MAPBOX_TOKEN) */
  accessToken: string;
  items: ExploreMapItem[];
  /** Highlight this item (hover sync) */
  highlightedKey: string | null;
  onBoundsChange: (bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => void;
  onMarkerHover: (key: string | null) => void;
  className?: string;
}

interface MapboxGLLike {
  accessToken: string;
  Map: new (options: Record<string, unknown>) => import("mapbox-gl").Map;
  NavigationControl: new () => import("mapbox-gl").IControl;
  Marker: new (opts?: { element?: HTMLElement }) => import("mapbox-gl").Marker;
  LngLatBounds: new () => import("mapbox-gl").LngLatBounds;
}

/**
 * Mapbox GL map with markers for projects (solid dot + halo), designers (outline dot), brands (square).
 * On moveend, calls onBoundsChange with current bbox (debounce is applied by parent).
 * TODO: clustering when item count is high.
 */
export default function ExploreMapboxMap({
  accessToken,
  items,
  highlightedKey,
  onBoundsChange,
  onMarkerHover,
  className = "",
}: ExploreMapboxMapProps) {
  const [mounted, setMounted] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = React.useRef<MapboxGLLike | null>(null);
  const markersRef = React.useRef<Map<string, { marker: import("mapbox-gl").Marker; el: HTMLDivElement }>>(new Map());
  const onBoundsChangeRef = React.useRef(onBoundsChange);
  const onMarkerHoverRef = React.useRef(onMarkerHover);
  const hasFittedRef = React.useRef(false);

  React.useEffect(() => setMounted(true), []);

  onBoundsChangeRef.current = onBoundsChange;
  onMarkerHoverRef.current = onMarkerHover;

  React.useEffect(() => {
    if (!mounted || !containerRef.current || !accessToken?.trim()) return;
    if (mapRef.current) return;
    let cancelled = false;
    let map: import("mapbox-gl").Map | null = null;

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      if (mapRef.current) return;
      const mb = mapboxgl.default as unknown as MapboxGLLike;
      mb.accessToken = accessToken;
      map = new mb.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      });
      map.addControl(new mb.NavigationControl(), "top-right");
      mapboxRef.current = mb;

      const emitBounds = () => {
        if (!map) return;
        const b = map.getBounds();
        if (b) {
          const sw = b.getSouthWest();
          const ne = b.getNorthEast();
          onBoundsChangeRef.current({
            minLat: sw.lat,
            minLng: sw.lng,
            maxLat: ne.lat,
            maxLng: ne.lng,
          });
        }
      };

      map.on("load", () => {
        if (cancelled) return;
        emitBounds();
      });
      map.on("moveend", emitBounds);

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      hasFittedRef.current = false;
      mapboxRef.current = null;
      markersRef.current.forEach((e) => e.marker.remove());
      markersRef.current.clear();
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [mounted, accessToken]);

  // Update markers when items or highlightedKey change
  React.useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    const existingKeys = new Set(markersRef.current.keys());
    const itemKeys = new Set(items.map((i) => exploreItemKey(i)));

    for (const key of existingKeys) {
      if (!itemKeys.has(key)) {
        const entry = markersRef.current.get(key);
        if (entry) {
          entry.marker.remove();
          markersRef.current.delete(key);
        }
      }
    }

    for (const item of items) {
      const pos = getItemLatLng(item);
      if (!pos) continue;
      const key = exploreItemKey(item);
      const isHighlighted = key === highlightedKey;

      if (markersRef.current.has(key)) {
        const entry = markersRef.current.get(key)!;
        updateMarkerStyle(entry.el, item, isHighlighted);
        continue;
      }

      const el = document.createElement("div");
      el.className = "explore-marker";
      el.setAttribute("data-key", key);
      el.setAttribute("role", "button");
      el.setAttribute("tabIndex", "0");
      el.setAttribute("aria-label", getMarkerLabel(item));
      updateMarkerStyle(el, item, isHighlighted);

      el.addEventListener("mouseenter", () => onMarkerHoverRef.current(key));
      el.addEventListener("mouseleave", () => onMarkerHoverRef.current(null));
      el.addEventListener("focus", () => onMarkerHoverRef.current(key));
      el.addEventListener("blur", () => onMarkerHoverRef.current(null));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);
      markersRef.current.set(key, { marker, el });
    }
  }, [items, highlightedKey]);

  // Fit map to item bounds once when we first get data (separate effect to avoid running multiple times)
  React.useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;
    if (hasFittedRef.current) return;
    if (!items || items.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoint = false;
    items.forEach((item) => {
      const pos = getItemLatLng(item);
      if (pos != null && typeof pos.lat === "number" && typeof pos.lng === "number") {
        bounds.extend([pos.lng, pos.lat]);
        hasPoint = true;
      }
    });
    if (hasPoint) {
      hasFittedRef.current = true;
      map.fitBounds(bounds, { padding: 80, duration: 800, maxZoom: 12 });
    }
  }, [items]);

  if (!mounted) {
    return null;
  }
  if (!accessToken?.trim()) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-neutral-100 text-sm text-neutral-500 ${className}`.trim()}>
        Add NEXT_PUBLIC_MAPBOX_TOKEN to show the map.
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", minHeight: 400 }}>
      <div ref={containerRef} className="absolute inset-0" style={{ borderRadius: 4 }} />
      <style>{`
        .explore-marker { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .explore-marker:hover, .explore-marker.highlighted { transform: scale(1.2); z-index: 10; }
        .explore-marker.project { width: 14px; height: 14px; border-radius: 50%; background: #002abf; box-shadow: 0 0 0 3px rgba(0,42,191,0.4); }
        .explore-marker.project.highlighted { box-shadow: 0 0 0 5px rgba(0,42,191,0.6); }
        .explore-marker.designer { width: 12px; height: 12px; border-radius: 50%; background: transparent; border: 2px solid #16a34a; }
        .explore-marker.designer.highlighted { background: rgba(22,163,74,0.3); }
        .explore-marker.brand { width: 10px; height: 10px; background: #ea580c; transform: rotate(45deg); }
        .explore-marker.brand.highlighted { box-shadow: 0 0 0 3px rgba(234,88,12,0.5); }
      `}</style>
    </div>
  );
}

function getMarkerLabel(item: ExploreMapItem): string {
  if (item.kind === "listing") return item.title ?? "Project";
  return item.display_name ?? item.username ?? (item.role === "designer" ? "Designer" : "Brand");
}

function updateMarkerStyle(
  el: HTMLDivElement,
  item: ExploreMapItem,
  highlighted: boolean
): void {
  el.classList.remove("project", "designer", "brand", "highlighted");
  if (item.kind === "listing") el.classList.add("project");
  else if (item.role === "designer") el.classList.add("designer");
  else el.classList.add("brand");
  if (highlighted) el.classList.add("highlighted");
}
