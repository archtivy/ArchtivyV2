"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type {
  ExploreMapItem,
  ExploreMapListingItem,
  ExploreMapStats,
} from "@/lib/explore-map/types";
import { getListingUrl } from "@/lib/canonical";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const API_URL = "/api/explore";
const DEBOUNCE_MS = 400;

interface ExploreMapProps {
  /** Initial filter params to append to the API call */
  mode?: "all" | "projects" | "designers" | "brands";
  searchQuery?: string;
  onStatsUpdate?: (stats: ExploreMapStats) => void;
  onItemClick?: (item: ExploreMapItem) => void;
}

export function ExploreMap({
  mode = "projects",
  searchQuery,
  onStatsUpdate,
  onItemClick,
}: ExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(
    async (map: mapboxgl.Map) => {
      const bounds = map.getBounds();
      if (!bounds) return;

      const params = new URLSearchParams({
        mode,
        minLat: String(bounds.getSouth()),
        maxLat: String(bounds.getNorth()),
        minLng: String(bounds.getWest()),
        maxLng: String(bounds.getEast()),
      });
      if (searchQuery?.trim()) params.set("q", searchQuery.trim());

      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?${params}`);
        if (!res.ok) return;
        const { items, stats } = (await res.json()) as {
          items: ExploreMapItem[];
          stats: ExploreMapStats;
        };

        onStatsUpdate?.(stats);

        // Build GeoJSON from items
        const features: GeoJSON.Feature[] = [];
        for (const item of items) {
          const lat =
            item.kind === "listing"
              ? (item as ExploreMapListingItem).location_lat
              : item.location_lat;
          const lng =
            item.kind === "listing"
              ? (item as ExploreMapListingItem).location_lng
              : item.location_lng;
          if (lat == null || lng == null) continue;

          features.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              id: item.id,
              kind: item.kind,
              title:
                item.kind === "listing"
                  ? (item as ExploreMapListingItem).title
                  : item.display_name,
              coverImage:
                item.kind === "listing"
                  ? (item as ExploreMapListingItem).cover_image_url
                  : item.avatar_url,
            },
          });
        }

        const source = map.getSource("explore-items") as mapboxgl.GeoJSONSource | undefined;
        const geojson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features,
        };

        if (source) {
          source.setData(geojson);
        } else {
          map.addSource("explore-items", {
            type: "geojson",
            data: geojson,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
          });

          // Cluster circles
          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "explore-items",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#002abf",
                10,
                "#0040ff",
                50,
                "#0060ff",
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                18,
                10,
                24,
                50,
                32,
              ],
            },
          });

          // Cluster count labels
          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "explore-items",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
            paint: { "text-color": "#ffffff" },
          });

          // Individual points
          map.addLayer({
            id: "unclustered-point",
            type: "circle",
            source: "explore-items",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": "#002abf",
              "circle-radius": 6,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            },
          });

          // Heatmap layer (visible at low zoom)
          map.addLayer(
            {
              id: "heatmap",
              type: "heatmap",
              source: "explore-items",
              maxzoom: 9,
              paint: {
                "heatmap-weight": 1,
                "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0, "rgba(0,42,191,0)",
                  0.2, "rgba(0,42,191,0.3)",
                  0.4, "rgba(0,64,255,0.5)",
                  0.6, "rgba(0,96,255,0.7)",
                  0.8, "rgba(51,128,255,0.85)",
                  1, "rgba(102,170,255,1)",
                ],
                "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 9, 30],
                "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
              },
            },
            "clusters"
          );

          // Click handlers
          map.on("click", "unclustered-point", (e) => {
            const feature = e.features?.[0];
            if (!feature?.properties) return;
            const itemId = feature.properties.id;
            const matched = items.find((i) => i.id === itemId);
            if (matched) onItemClick?.(matched);
          });

          map.on("click", "clusters", (e) => {
            const feature = e.features?.[0];
            if (!feature?.geometry || feature.geometry.type !== "Point") return;
            const clusterId = feature.properties?.cluster_id;
            const src = map.getSource("explore-items") as mapboxgl.GeoJSONSource;
            src.getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err || zoom == null) return;
              map.easeTo({
                center: feature.geometry.type === "Point"
                  ? (feature.geometry.coordinates as [number, number])
                  : [0, 0],
                zoom,
              });
            });
          });

          // Cursor
          map.on("mouseenter", "unclustered-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "unclustered-point", () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("mouseenter", "clusters", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "clusters", () => {
            map.getCanvas().style.cursor = "";
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [mode, searchQuery, onStatsUpdate, onItemClick]
  );

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [10, 30],
      zoom: 2,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      fetchItems(map);
    });

    map.on("moveend", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (mapRef.current) fetchItems(mapRef.current);
      }, DEBOUNCE_MS);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [fetchItems]);

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>
      <div ref={containerRef} className="absolute inset-0 rounded-lg overflow-hidden" />
      {loading && (
        <div className="absolute top-3 left-3 rounded-md bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm dark:bg-zinc-900/90 dark:text-zinc-400">
          Loading...
        </div>
      )}
    </div>
  );
}
