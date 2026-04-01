"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MapDetailSidebar } from "./MapDetailSidebar";
import { MapPinPreview } from "./MapPinPreview";
import { FloatingAISearch } from "./FloatingAISearch";
import { SpotlightCallout } from "./SpotlightCallout";
import { MapControls } from "./MapControls";
import { parseSearchIntent, type EntityType } from "@/lib/explore/parseSearchIntent";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export type PinType = "project" | "product" | "brand" | "designer";

export interface MapPin {
  id: string;
  type: PinType;
  title: string;
  locationLabel: string;
  lat: number;
  lng: number;
  href: string;
  imageUrl: string | null;
  subtitle: string | null;
  year: string | null;
  createdAt: string | null;
  category: string | null;
  ownerName: string | null;
  ownerProfileId: string | null;
  entityId: string | null;
  /** True when this listing has an active paid map spotlight campaign. */
  isPromoted?: boolean;
}

interface Props {
  pins: MapPin[];
  initialCenter?: { lat: number; lng: number } | null;
  spotlight?: MapPin | null;
  recentPins?: MapPin[];
  /** URL-driven focus: filter to this entity type (projects, designers, brands). */
  focusType?: string | null;
  /** URL-driven focus: slug or username to auto-center and select. */
  focusSlug?: string | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const GEOCODE_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export const COLORS: Record<PinType, string> = {
  project: "#002abf",
  product: "#059669",
  designer: "#7c3aed",
  brand: "#d4a017",
};

const LABELS: Record<PinType, string> = {
  project: "Projects",
  product: "Products",
  designer: "Designers",
  brand: "Brands",
};

const singular = (t: PinType) => LABELS[t].replace(/s$/, "");

const PIN_LAYER_ORDER: PinType[] = ["brand", "designer", "project"];
const pinLayerId = (t: PinType) => `pins-${t}`;
const ALL_PIN_LAYERS = PIN_LAYER_ORDER.map(pinLayerId);

const PIN_RADIUS: Record<string, number> = {
  brand: 5.5,
  designer: 6,
  project: 7,
};

interface GeoResult {
  id: string;
  label: string;
  center: [number, number];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function ExploreMapView({ pins, initialCenter, spotlight, recentPins = [], focusType, focusSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const sourceReadyRef = useRef(false);

  /* ── State ─────────────────────────────────────────────────────────────── */

  const [selected, setSelected] = useState<MapPin | null>(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [contextSpotlight, setContextSpotlight] = useState<MapPin | null>(null);
  const [feedIndex, setFeedIndex] = useState(0);
  const spotlightTypeRef = useRef<number>(0); // 0=project, 1=brand, 2=designer

  const [hoveredPin, setHoveredPin] = useState<MapPin | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const [highlightedPinIds, setHighlightedPinIds] = useState<Set<string>>(new Set());
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number } | null>(null);

  const [mapReady, setMapReady] = useState(false);

  // Search state
  const [searchActive, setSearchActive] = useState(false);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [searchResultCount, setSearchResultCount] = useState<number | null>(null);
  const [searchMatchedIds, setSearchMatchedIds] = useState<Set<string>>(new Set());

  /* ── Refs ───────────────────────────────────────────────────────────────── */

  const pinMapRef = useRef(new Map<string, MapPin>());
  pinMapRef.current = new Map(pins.map((p) => [p.id, p]));

  /* ── Derived data ──────────────────────────────────────────────────────── */

  const spotlightId = spotlight?.id ?? null;

  // Pre-compute radial offsets for colocated pins (same lat/lng).
  // Uses a golden-angle spiral so pins fan out evenly around the true location.
  // The offset (~20 m) is sub-pixel at city zoom but separates at street zoom.
  const pinOffsets = useMemo(() => {
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399 rad
    const BASE_RADIUS = 0.00018; // degrees — ≈ 20 m at the equator

    // Group by coordinate key
    const groups = new Map<string, MapPin[]>();
    for (const p of pins) {
      const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
      const arr = groups.get(key);
      if (arr) arr.push(p);
      else groups.set(key, [p]);
    }

    const offsets = new Map<string, [number, number]>(); // id → [lng, lat]
    for (const [, arr] of groups) {
      if (arr.length < 2) {
        offsets.set(arr[0].id, [arr[0].lng, arr[0].lat]);
        continue;
      }
      // Spread pins in a golden-angle spiral around the group center
      const cLat = arr[0].lat;
      const cLng = arr[0].lng;
      for (let i = 0; i < arr.length; i++) {
        const angle = i * GOLDEN_ANGLE;
        const r = BASE_RADIUS * Math.sqrt((i + 1) / arr.length);
        // Adjust lng offset for latitude compression
        const lngScale = 1 / Math.max(Math.cos(cLat * Math.PI / 180), 0.01);
        offsets.set(arr[i].id, [
          cLng + r * lngScale * Math.cos(angle),
          cLat + r * Math.sin(angle),
        ]);
      }
    }
    return offsets;
  }, [pins]);

  const geojson = useMemo(
    (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
      type: "FeatureCollection",
      features: pins.map((p) => {
        const coords = pinOffsets.get(p.id) ?? [p.lng, p.lat];
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: coords },
          properties: {
            id: p.id,
            pinType: p.type,
            title: p.title,
            locationLabel: p.locationLabel,
            imageUrl: p.imageUrl ?? "",
            subtitle: p.subtitle ?? "",
            year: p.year ?? "",
            isSpotlight: p.id === spotlightId,
            isNew:
              p.createdAt != null &&
              Date.now() - new Date(p.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
            isHighlighted: highlightedPinIds.has(p.id),
            isSearchMatch: searchActive ? searchMatchedIds.has(p.id) : true,
          },
        };
      }),
    }),
    [pins, pinOffsets, spotlightId, highlightedPinIds, searchActive, searchMatchedIds],
  );

  const geojsonRef = useRef(geojson);
  geojsonRef.current = geojson;

  const similarPins = useMemo(() => {
    if (!selected) return [];
    const sameType = selected.type === "project" || selected.type === "product";
    const candidates = pins.filter(
      (p) => p.id !== selected.id && (sameType ? p.type === selected.type : true),
    );
    const scored = candidates.map((p) => {
      let score = 0;
      if (p.subtitle && p.subtitle === selected.subtitle) score += 3;
      if (p.locationLabel === selected.locationLabel) score += 2;
      if (haversineKm(p.lat, p.lng, selected.lat, selected.lng) < 200) score += 1;
      return { pin: p, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.pin);
  }, [selected, pins]);

  /* ── Activity feed cycling ─────────────────────────────────────────────── */

  useEffect(() => {
    if (recentPins.length <= 1) return;
    const iv = setInterval(() => setFeedIndex((i) => (i + 1) % recentPins.length), 4000);
    return () => clearInterval(iv);
  }, [recentPins.length]);

  /* ── Spotlight delayed entrance ────────────────────────────────────────── */

  useEffect(() => {
    if (!spotlight) return;
    const t = setTimeout(() => setShowSpotlight(true), 2000);
    return () => clearTimeout(t);
  }, [spotlight]);

  /* ── Context-aware spotlight: pick from visible pins ─────────────────── */

  const pickContextSpotlight = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;

    const types: PinType[] = ["project", "brand", "designer"];
    const targetType = types[spotlightTypeRef.current % types.length];
    spotlightTypeRef.current++;

    const visible = pins.filter((p) =>
      p.type === targetType &&
      p.lat >= bounds.getSouth() &&
      p.lat <= bounds.getNorth() &&
      p.lng >= bounds.getWest() &&
      p.lng <= bounds.getEast()
    );

    if (visible.length === 0) {
      // Fallback: try any type in view
      const fallback = pins.filter((p) =>
        p.lat >= bounds.getSouth() && p.lat <= bounds.getNorth() &&
        p.lng >= bounds.getWest() && p.lng <= bounds.getEast()
      );
      if (fallback.length > 0) {
        setContextSpotlight(fallback[Math.floor(Math.random() * fallback.length)]);
      }
      return;
    }

    setContextSpotlight(visible[Math.floor(Math.random() * visible.length)]);
  }, [pins]);

  // Pick on map move (debounced)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let timeout: ReturnType<typeof setTimeout>;
    const onMoveEnd = () => {
      clearTimeout(timeout);
      timeout = setTimeout(pickContextSpotlight, 600);
    };
    map.on("moveend", onMoveEnd);

    // Initial pick
    const initialTimeout = setTimeout(pickContextSpotlight, 3000);

    return () => {
      map.off("moveend", onMoveEnd);
      clearTimeout(timeout);
      clearTimeout(initialTimeout);
    };
  }, [mapReady, pickContextSpotlight]);

  // Rotate every 15 seconds when idle
  useEffect(() => {
    if (selected) return;
    const iv = setInterval(pickContextSpotlight, 15000);
    return () => clearInterval(iv);
  }, [selected, pickContextSpotlight]);

  const activeSpotlight = contextSpotlight ?? spotlight ?? null;

  /* ── URL-driven focus: auto-center and select a pin ──────────────────── */

  const focusAppliedRef = useRef(false);

  useEffect(() => {
    if (!focusSlug || !mapReady || focusAppliedRef.current) return;
    const map = mapRef.current;
    if (!map) return;

    // Resolve the type filter from URL param (e.g. "projects" → "project")
    const typeMap: Record<string, PinType> = {
      projects: "project",
      products: "product",
      designers: "designer",
      brands: "brand",
    };
    const filterType = focusType ? typeMap[focusType] ?? null : null;

    // Find the matching pin by slug (in href) or entityId
    const slug = decodeURIComponent(focusSlug);
    const match = pins.find((p) => {
      if (filterType && p.type !== filterType) return false;
      if (p.href.includes(`/${slug}`)) return true;
      if (p.entityId === slug) return true;
      return false;
    });

    if (match) {
      focusAppliedRef.current = true;
      setSelected(match);
      map.setFilter("selected-ring", ["==", ["get", "id"], match.id]);
      map.flyTo({ center: [match.lng, match.lat], zoom: 14, duration: 1200 });
    }
  }, [focusSlug, focusType, pins, mapReady]);

  /* ── Track container rect for hover preview positioning ────────────────── */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Map initialisation (runs once) ────────────────────────────────────── */

  useEffect(() => {
    if (!containerRef.current || !TOKEN) return;
    mapboxgl.accessToken = TOKEN;

    const hasGeo = initialCenter != null;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      projection: "mercator",
      center: hasGeo ? [initialCenter.lng, initialCenter.lat] : [29, 41],
      zoom: hasGeo ? 5 : 2,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    mapRef.current = map;

    map.on("load", () => {
      sourceReadyRef.current = true;

      /* ── GeoJSON source with clustering ──────────────────────────── */

      map.addSource("pins", {
        type: "geojson",
        data: geojsonRef.current,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
        clusterProperties: {
          projectCount: ["+", ["case", ["==", ["get", "pinType"], "project"], 1, 0]],
          productCount: ["+", ["case", ["==", ["get", "pinType"], "product"], 1, 0]],
          designerCount: ["+", ["case", ["==", ["get", "pinType"], "designer"], 1, 0]],
          brandCount: ["+", ["case", ["==", ["get", "pinType"], "brand"], 1, 0]],
        },
      });

      /* ── Cluster circles (color by dominant type) ──────────────────── */

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "case",
            [">=", ["get", "projectCount"], ["max", ["get", "productCount"], ["get", "designerCount"], ["get", "brandCount"]]],
            "rgba(0, 42, 191, 0.08)",
            [">=", ["get", "productCount"], ["max", ["get", "designerCount"], ["get", "brandCount"]]],
            "rgba(5, 150, 105, 0.08)",
            [">=", ["get", "designerCount"], ["get", "brandCount"]],
            "rgba(124, 58, 237, 0.08)",
            "rgba(212, 160, 23, 0.08)",
          ],
          "circle-radius": ["step", ["get", "point_count"], 22, 10, 28, 50, 34, 200, 40],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": [
            "case",
            [">=", ["get", "projectCount"], ["max", ["get", "productCount"], ["get", "designerCount"], ["get", "brandCount"]]],
            "rgba(0, 42, 191, 0.20)",
            [">=", ["get", "productCount"], ["max", ["get", "designerCount"], ["get", "brandCount"]]],
            "rgba(5, 150, 105, 0.20)",
            [">=", ["get", "designerCount"], ["get", "brandCount"]],
            "rgba(124, 58, 237, 0.20)",
            "rgba(212, 160, 23, 0.20)",
          ],
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": [
            "case",
            [">=", ["get", "projectCount"], ["max", ["get", "productCount"], ["get", "designerCount"], ["get", "brandCount"]]],
            "#002abf",
            [">=", ["get", "productCount"], ["max", ["get", "designerCount"], ["get", "brandCount"]]],
            "#059669",
            [">=", ["get", "designerCount"], ["get", "brandCount"]],
            "#7c3aed",
            "#d4a017",
          ],
        },
      });

      /* ── New-pin glow ring ─────────────────────────────────────────── */

      map.addLayer({
        id: "new-pin-ring",
        type: "circle",
        source: "pins",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isNew"], true]],
        paint: {
          "circle-radius": 12,
          "circle-color": "transparent",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(0, 42, 191, 0.15)",
        },
      });

      /* ── Spotlight: outer soft halo ───────────────────────────────── */

      map.addLayer({
        id: "spotlight-halo",
        type: "circle",
        source: "pins",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSpotlight"], true]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 16, 8, 22, 14, 28],
          "circle-color": "rgba(180, 140, 40, 0.04)",
          "circle-stroke-width": 0,
        },
      });

      /* ── Spotlight: refined ring ─────────────────────────────────── */

      map.addLayer({
        id: "spotlight-ring",
        type: "circle",
        source: "pins",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isSpotlight"], true]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 12, 8, 16, 14, 20],
          "circle-color": "rgba(180, 140, 40, 0.06)",
          "circle-stroke-width": 1.2,
          "circle-stroke-color": "rgba(180, 140, 40, 0.35)",
        },
      });

      /* ── Per-type pin layers ───────────────────────────────────────── */

      for (const type of PIN_LAYER_ORDER) {
        const r = PIN_RADIUS[type];
        // Mapbox GL rule: camera expressions (interpolate over zoom) must be
        // at the top level — data expressions (case) go inside each stop.
        const spot = ["==", ["get", "isSpotlight"], true] as mapboxgl.Expression;
        const dimmed = ["==", ["get", "isSearchMatch"], false] as mapboxgl.Expression;

        map.addLayer({
          id: pinLayerId(type),
          type: "circle",
          source: "pins",
          filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "pinType"], type]],
          paint: {
            "circle-color": [
              "case", spot,
              "#8a6d14", // richer gold tone for featured pin
              COLORS[type],
            ],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              2,  ["case", spot, r * 1.0, r * 0.7],
              8,  ["case", spot, r * 1.4, r],
              14, ["case", spot, r * 1.7, r * 1.3],
            ],
            "circle-stroke-width": ["case", spot, 2, 1.5],
            "circle-stroke-color": [
              "case", spot,
              "rgba(255, 255, 255, 0.9)",
              "#ffffff",
            ],
            "circle-opacity": [
              "interpolate", ["linear"], ["zoom"],
              2,  ["case", dimmed, 0.12, 0.8],
              8,  ["case", dimmed, 0.12, 1],
            ],
            "circle-stroke-opacity": ["case", dimmed, 0.12, 1],
          },
        });
      }

      /* ── Related/highlighted pin ring ──────────────────────────────── */

      map.addLayer({
        id: "related-ring",
        type: "circle",
        source: "pins",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "isHighlighted"], true]],
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(0, 42, 191, 0.06)",
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(0, 42, 191, 0.45)",
        },
      });

      /* ── Selected pin ring ──────────────────────────────────────────── */

      map.addLayer({
        id: "selected-ring",
        type: "circle",
        source: "pins",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-radius": 14,
          "circle-color": "transparent",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#002abf",
          "circle-stroke-opacity": 0.5,
        },
      });

      /* ── Network relationship lines ──────────────────────────────────── */

      map.addSource("network-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "network-lines",
        type: "line",
        source: "network-lines",
        paint: {
          "line-color": "rgba(0, 42, 191, 0.18)",
          "line-width": 1.2,
          "line-dasharray": [4, 3],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      }, "new-pin-ring"); // render below pins

      /* ── Interactions ────────────────────────────────────────────────── */

      let hoveredId: string | null = null;
      let clickHandled = false;

      for (const layerId of ALL_PIN_LAYERS) {
        map.on("mousemove", layerId, (e) => {
          const f = e.features?.[0];
          if (!f?.properties) return;
          const fId = f.properties.id as string;
          if (hoveredId === fId) {
            const pt = map.project((f.geometry as GeoJSON.Point).coordinates as [number, number]);
            setHoverPos({ x: pt.x, y: pt.y });
            return;
          }
          hoveredId = fId;
          map.getCanvas().style.cursor = "pointer";
          const pin = pinMapRef.current.get(fId);
          if (pin) {
            const pt = map.project((f.geometry as GeoJSON.Point).coordinates as [number, number]);
            setHoveredPin(pin);
            setHoverPos({ x: pt.x, y: pt.y });
          }
        });

        map.on("mouseleave", layerId, () => {
          hoveredId = null;
          map.getCanvas().style.cursor = "";
          setHoveredPin(null);
          setHoverPos(null);
        });

        map.on("click", layerId, (e) => {
          clickHandled = true;
          const f = e.features?.[0];
          if (!f?.properties?.id) return;
          const pin = pinMapRef.current.get(f.properties.id as string);
          if (!pin) return;
          setSelected(pin);
          setHoveredPin(null);
          setHoverPos(null);
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          map.setFilter("selected-ring", ["==", ["get", "id"], pin.id]);
          map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 12), duration: 800 });
        });
      }

      map.on("click", "clusters", (e) => {
        clickHandled = true;
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: map.getZoom() + 3, duration: 500 });
      });

      map.on("click", () => {
        if (clickHandled) { clickHandled = false; return; }
        setSelected(null);
        map.setFilter("selected-ring", ["==", ["get", "id"], ""]);
      });

      map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      map.on("movestart", () => { setHoveredPin(null); setHoverPos(null); hoveredId = null; });

      /* ── Track spotlight pin screen position ──────────────────────── */

      const updateSpotlightPos = () => {
        if (!spotlight) return;
        const pt = map.project([spotlight.lng, spotlight.lat]);
        const bounds = map.getContainer().getBoundingClientRect();
        // Only show callout if pin is visible in viewport
        if (pt.x >= 0 && pt.x <= bounds.width && pt.y >= 0 && pt.y <= bounds.height) {
          setSpotlightPos({ x: pt.x, y: pt.y });
        } else {
          setSpotlightPos(null);
        }
      };

      map.on("move", updateSpotlightPos);
      map.on("zoom", updateSpotlightPos);
      map.on("idle", updateSpotlightPos);

      /* ── Gentle spotlight halo pulse ──────────────────────────────── */

      if (spotlight) {
        let pulseFrame = 0;
        const pulseInterval = setInterval(() => {
          if (!map.getLayer("spotlight-halo")) { clearInterval(pulseInterval); return; }
          pulseFrame += 0.02;
          const opacity = 0.03 + Math.sin(pulseFrame) * 0.02; // oscillates 0.01 – 0.05
          const radius = 22 + Math.sin(pulseFrame) * 2; // oscillates 20 – 24 at z8
          map.setPaintProperty("spotlight-halo", "circle-color", `rgba(180, 140, 40, ${opacity})`);
          map.setPaintProperty("spotlight-halo", "circle-radius", radius);
        }, 50);
      }

      if (!hasGeo) {
        const data = geojsonRef.current;
        if (data.features.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          for (const feat of data.features) bounds.extend(feat.geometry.coordinates as [number, number]);
          map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 0 });
        }
      }

      setMapReady(true);
    });

    return () => { map.remove(); mapRef.current = null; sourceReadyRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sync source data ──────────────────────────────────────────────────── */

  useEffect(() => {
    if (!sourceReadyRef.current || !mapRef.current) return;
    const src = mapRef.current.getSource("pins") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(geojson);
  }, [geojson]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const selectPin = useCallback((pin: MapPin) => {
    setSelected(pin);
    setHoveredPin(null);
    setHoverPos(null);
    mapRef.current?.setFilter?.("selected-ring", ["==", ["get", "id"], pin.id]);
    mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 14, duration: 1000 });
  }, []);

  const flyToSpotlight = useCallback(() => {
    if (!spotlight) return;
    selectPin(spotlight);
  }, [spotlight, selectPin]);

  const handleCloseDetail = useCallback(() => {
    setSelected(null);
    setHighlightedPinIds(new Set());
    mapRef.current?.setFilter?.("selected-ring", ["==", ["get", "id"], ""]);
  }, []);

  const handleHighlightPins = useCallback((ids: Set<string>) => {
    setHighlightedPinIds(ids);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 10, duration: 1200 });
      },
      () => { /* silently fail */ },
      { timeout: 8000 }
    );
  }, []);

  const handleResetView = useCallback(() => {
    const center = initialCenter ?? { lat: 30, lng: 10 };
    mapRef.current?.flyTo({ center: [center.lng, center.lat], zoom: 2, duration: 1000 });
  }, [initialCenter]);

  const handleFilterByOwner = useCallback((ownerName: string) => {
    // Future: pipe owner filter into AI search context
    void ownerName;
  }, []);

  /* ── Network lines: update when selection/highlights change ────────────── */

  useEffect(() => {
    if (!sourceReadyRef.current || !mapRef.current) return;
    const src = mapRef.current.getSource("network-lines") as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;

    if (!selected || highlightedPinIds.size === 0) {
      src.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const from: [number, number] = [selected.lng, selected.lat];

    for (const hId of highlightedPinIds) {
      const pin = pinMapRef.current.get(hId);
      if (!pin || pin.id === selected.id) continue;
      // Skip pins at essentially the same location (avoids zero-length lines)
      if (Math.abs(pin.lat - selected.lat) < 0.001 && Math.abs(pin.lng - selected.lng) < 0.001) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [from, [pin.lng, pin.lat]],
        },
        properties: {},
      });
    }

    src.setData({ type: "FeatureCollection", features });
  }, [selected, highlightedPinIds, pins]);

  /* ── AI search handler (intent-based) ─────────────────────────────────── */

  const handleAISearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (!q) return;

      const intent = parseSearchIntent(q);

      // 1. Filter pins by structured intent
      let filtered = [...pins];

      // Entity type filter
      if (intent.types.length > 0) {
        filtered = filtered.filter((p) => intent.types.includes(p.type as EntityType));
      }

      // Category / discipline / brand-type filter
      if (intent.categories.length > 0) {
        filtered = filtered.filter((p) => {
          const cat = (p.category ?? p.subtitle ?? "").toLowerCase();
          const title = p.title.toLowerCase();
          return intent.categories.some(
            (c) => cat.includes(c.toLowerCase()) || title.includes(c.toLowerCase()),
          );
        });
      }

      // Material filter (against title/subtitle — materials not on MapPin)
      if (intent.materials.length > 0) {
        filtered = filtered.filter((p) => {
          const haystack = `${p.title} ${p.subtitle ?? ""} ${p.category ?? ""}`.toLowerCase();
          return intent.materials.some((m) => haystack.includes(m.toLowerCase()));
        });
      }

      // Style filter
      if (intent.styles.length > 0) {
        filtered = filtered.filter((p) => {
          const haystack = `${p.title} ${p.subtitle ?? ""} ${p.category ?? ""}`.toLowerCase();
          return intent.styles.some((s) => haystack.includes(s.toLowerCase()));
        });
      }

      // Free text filter (title, owner, subtitle)
      if (intent.freeText) {
        const ft = intent.freeText.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.title.toLowerCase().includes(ft) ||
            (p.ownerName && p.ownerName.toLowerCase().includes(ft)) ||
            (p.subtitle && p.subtitle.toLowerCase().includes(ft)),
        );
      }

      // 2. Location: try matching against locationLabel first, geocode as fallback
      let geocodedCenter: [number, number] | null = null;

      if (intent.location) {
        const loc = intent.location.toLowerCase();
        const locationMatched = filtered.filter((p) =>
          p.locationLabel.toLowerCase().includes(loc),
        );

        if (locationMatched.length > 0) {
          filtered = locationMatched;
        } else {
          // Geocode and filter by proximity
          try {
            const url = `${GEOCODE_URL}/${encodeURIComponent(intent.location)}.json?access_token=${TOKEN}&autocomplete=true&limit=1&language=en&types=place,region,country`;
            const res = await fetch(url);
            const data = await res.json();
            const features = (data.features ?? []) as { center: [number, number] }[];
            if (features.length > 0) {
              geocodedCenter = features[0].center;
              // Filter to pins within ~300km of geocoded point
              const nearby = filtered.filter(
                (p) => haversineKm(p.lat, p.lng, geocodedCenter![1], geocodedCenter![0]) < 300,
              );
              if (nearby.length > 0) filtered = nearby;
              // If no nearby matches with current filters, still fly there
            }
          } catch {
            // Silent fallback
          }
        }
      }

      // 3. Apply results
      const matchedIds = new Set(filtered.map((p) => p.id));
      setSearchActive(true);
      setSearchLabel(intent.label);
      setSearchResultCount(filtered.length);
      setSearchMatchedIds(matchedIds);

      // Clear sidebar selection
      setSelected(null);
      setHighlightedPinIds(new Set());
      mapRef.current?.setFilter?.("selected-ring", ["==", ["get", "id"], ""]);

      // 4. Navigate the map
      if (filtered.length === 1) {
        selectPin(filtered[0]);
      } else if (filtered.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const p of filtered) bounds.extend([p.lng, p.lat]);
        mapRef.current?.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 });
      } else if (geocodedCenter) {
        // No pin matches but we geocoded a location
        mapRef.current?.flyTo({ center: geocodedCenter, zoom: 10, duration: 1200 });
      } else if (intent.location) {
        // Last resort: geocode the raw location
        try {
          const url = `${GEOCODE_URL}/${encodeURIComponent(intent.location)}.json?access_token=${TOKEN}&autocomplete=true&limit=1&language=en&types=place,region,country`;
          const res = await fetch(url);
          const data = await res.json();
          const features = (data.features ?? []) as { center: [number, number] }[];
          if (features.length > 0) {
            mapRef.current?.flyTo({ center: features[0].center, zoom: 10, duration: 1200 });
          }
        } catch {
          // Silent
        }
      }
    },
    [pins, selectPin],
  );

  const handleClearSearch = useCallback(() => {
    setSearchActive(false);
    setSearchLabel(null);
    setSearchResultCount(null);
    setSearchMatchedIds(new Set());
    setHighlightedPinIds(new Set());
  }, []);

  /* ── Early return ──────────────────────────────────────────────────────── */

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Map unavailable — Mapbox token not configured.
      </div>
    );
  }

  const currentFeedPin = recentPins[feedIndex] ?? null;

  /* ═══════════════════════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="relative h-full w-full overflow-hidden">
      <style>{`
        @keyframes feed-slide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pin-preview-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .feed-enter{animation:feed-slide .4s ease-out}
        @keyframes spotlight-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      {/* ── Fullscreen map ─────────────────────────────────────────────────── */}
      {/*
        The sizing wrapper stays `absolute inset-0` and is never touched by Mapbox.
        The inner container uses `h-full w-full` — Mapbox adds `.mapboxgl-map`
        which sets `position: relative`, but that's fine when sizing is via
        percentage height/width instead of absolute inset.
      */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Hover preview — positioned relative to ExploreMapView root */}
      {hoveredPin && hoverPos && !selected && (
        <MapPinPreview pin={hoveredPin} position={hoverPos} containerRect={containerRect} />
      )}

      {/* ── Floating AI search — bottom center ────────────────────────────── */}
      <FloatingAISearch
        onSubmit={handleAISearch}
        panelOpen={!!selected}
        searchLabel={searchLabel}
        resultCount={searchResultCount}
        onClear={handleClearSearch}
        totalPins={pins.length}
      />

      {/* ── Context-aware spotlight — top right ──────────────────────────── */}
      {activeSpotlight && (
        <SpotlightCallout
          pin={activeSpotlight}
          visible={showSpotlight && !selected}
          onClick={() => { if (activeSpotlight) selectPin(activeSpotlight); }}
        />
      )}

      {/* ── Map controls — right side ────────────────────────────────────── */}
      {!selected && (
        <MapControls onLocateMe={handleLocateMe} onResetView={handleResetView} />
      )}

      {/* ── Micro activity strip — lower left ──────────────────────────── */}
      {currentFeedPin && !selected && (
        <div className="absolute left-4 z-10 sm:bottom-24" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
          <button
            key={currentFeedPin.id}
            onClick={() => selectPin(currentFeedPin)}
            className="feed-enter flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-white/50"
            style={{
              background: "rgba(255, 255, 255, 0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
            }}
          >
            <span className="relative flex h-1 w-1 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500/80" />
            </span>
            <span className="text-[10px] text-zinc-500/80">
              New project in{" "}
              <span className="font-medium text-zinc-600/80">
                {currentFeedPin.locationLabel.split(",")[0] || "—"}
              </span>
            </span>
            {currentFeedPin.createdAt && (
              <span className="text-[10px] text-zinc-400/60">· {timeAgo(currentFeedPin.createdAt)}</span>
            )}
          </button>
        </div>
      )}

      {/* ── Detail sidebar ────────────────────────────────────────────────── */}
      <MapDetailSidebar
        selected={selected}
        similarPins={similarPins}
        allPins={pins}
        onClose={handleCloseDetail}
        onSelectPin={selectPin}
        onHighlightPins={handleHighlightPins}
        onFilterByOwner={handleFilterByOwner}
      />
    </div>
  );
}
