"use client";

import { useEffect, useRef } from "react";
import {
  REGION_COLORS,
  type LiveNetworkConnection,
  type LiveNetworkPin,
} from "@/lib/db/liveNetwork";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

function createMarkerElement(color: string, active: boolean): HTMLButtonElement {
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "live-network-marker";
  wrap.setAttribute("aria-hidden", "true");
  wrap.style.cssText = `
    position: relative;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transform: scale(${active ? 1.15 : 1});
    transition: transform 0.15s ease;
  `;

  const pulse = document.createElement("span");
  pulse.dataset.layer = "pulse";
  pulse.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border-radius: 50%;
    background: ${color};
    opacity: ${active ? 0.08 : 0.05};
    animation: live-network-pulse 2.5s ease-out infinite;
  `;

  const ring = document.createElement("span");
  ring.dataset.layer = "ring";
  ring.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    width: 18px;
    height: 18px;
    margin: -9px 0 0 -9px;
    border-radius: 50%;
    border: 1.5px solid ${color};
    opacity: ${active ? 0.35 : 0.28};
    box-sizing: border-box;
  `;

  const dot = document.createElement("span");
  dot.dataset.layer = "dot";
  dot.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    width: 10px;
    height: 10px;
    margin: -5px 0 0 -5px;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
  `;

  wrap.append(pulse, ring, dot);
  return wrap;
}

function buildLineGeoJson(
  connections: LiveNetworkConnection[],
  pinById: Map<string, LiveNetworkPin>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  for (const { from, to } of connections) {
    const a = pinById.get(from);
    const b = pinById.get(to);
    if (!a || !b) continue;
    features.push({
      type: "Feature",
      properties: { color: REGION_COLORS[a.region] },
      geometry: {
        type: "LineString",
        coordinates: [
          [a.lng, a.lat],
          [b.lng, b.lat],
        ],
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function LiveNetworkMap({
  pins,
  connections,
  countryCount,
  activePinId,
  onSelectPin,
}: {
  pins: LiveNetworkPin[];
  connections: LiveNetworkConnection[];
  countryCount: number;
  activePinId: string | null;
  onSelectPin: (pinId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<Map<string, { marker: import("mapbox-gl").Marker; el: HTMLButtonElement }>>(
    new Map()
  );
  const onSelectRef = useRef(onSelectPin);
  onSelectRef.current = onSelectPin;

  useEffect(() => {
    if (!containerRef.current || !TOKEN || pins.length === 0) return;

    let cancelled = false;
    let mapInstance: import("mapbox-gl").Map | null = null;

    import("mapbox-gl").then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;

      const mb = mapboxgl.default;
      mb.accessToken = TOKEN;

      const map = new mb.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [20, 20],
        zoom: 1.15,
        interactive: false,
        attributionControl: false,
        projection: "mercator",
      });

      mapInstance = map;
      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        const pinById = new Map(pins.map((p) => [p.id, p]));
        const lineData = buildLineGeoJson(connections, pinById);

        if (map.getSource("live-network-lines")) {
          (map.getSource("live-network-lines") as import("mapbox-gl").GeoJSONSource).setData(lineData);
        } else {
          map.addSource("live-network-lines", { type: "geojson", data: lineData });
          map.addLayer({
            id: "live-network-lines",
            type: "line",
            source: "live-network-lines",
            paint: {
              "line-color": ["get", "color"],
              "line-width": 1,
              "line-opacity": 0.25,
              "line-dasharray": [3, 4],
            },
          });
        }

        markersRef.current.forEach(({ marker }) => marker.remove());
        markersRef.current.clear();

        const bounds = new mb.LngLatBounds();
        for (const pin of pins) {
          bounds.extend([pin.lng, pin.lat]);
          const el = createMarkerElement(REGION_COLORS[pin.region], pin.id === activePinId);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current(pin.id);
          });
          const marker = new mb.Marker({ element: el, anchor: "center" })
            .setLngLat([pin.lng, pin.lat])
            .addTo(map);
          markersRef.current.set(pin.id, { marker, el });
        }

        if (pins.length > 1) {
          map.fitBounds(bounds, { padding: 48, maxZoom: 2.8, duration: 0 });
        } else if (pins[0]) {
          map.setCenter([pins[0].lng, pins[0].lat]);
          map.setZoom(4);
        }
      });
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      mapInstance?.remove();
      mapRef.current = null;
    };
  }, [pins, connections]);

  useEffect(() => {
    for (const [id, { el }] of markersRef.current) {
      const pin = pins.find((p) => p.id === id);
      if (!pin) continue;
      const active = id === activePinId;
      const color = REGION_COLORS[pin.region];
      el.style.transform = `scale(${active ? 1.15 : 1})`;
      const pulse = el.querySelector('[data-layer="pulse"]') as HTMLElement | null;
      const ring = el.querySelector('[data-layer="ring"]') as HTMLElement | null;
      const dot = el.querySelector('[data-layer="dot"]') as HTMLElement | null;
      if (pulse) {
        pulse.style.background = color;
        pulse.style.opacity = active ? "0.08" : "0.05";
      }
      if (ring) {
        ring.style.borderColor = color;
        ring.style.opacity = active ? "0.35" : "0.28";
      }
      if (dot) dot.style.background = color;
    }
  }, [activePinId, pins]);

  if (!TOKEN) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-[#f8f8fa] text-sm text-zinc-500">
        Map unavailable — Mapbox token not configured.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[280px] w-full">
      <style>{`
        @keyframes live-network-pulse {
          0% { transform: scale(0.6); opacity: 0.08; }
          70% { transform: scale(1.2); opacity: 0.02; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .live-network-map .mapboxgl-canvas { outline: none; }
        .live-network-map .mapboxgl-ctrl-bottom-right { display: none; }
      `}</style>
      <div ref={containerRef} className="live-network-map absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-4 z-10 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[11px] font-medium text-zinc-600">
          Live · {countryCount} {countryCount === 1 ? "country" : "countries"}
        </span>
      </div>
    </div>
  );
}
