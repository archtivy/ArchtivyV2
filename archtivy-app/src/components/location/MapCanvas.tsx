"use client";

import { useEffect, useRef } from "react";

export interface MapCanvasProps {
  /** Mapbox access token (must be from client state, not module scope). */
  accessToken: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  center: { lat: number; lng: number };
  onLoaded: () => void;
  onError: (message: string) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
}

/**
 * Renders nothing; creates Mapbox map inside useEffect (client-only, no SSR).
 * Imports mapbox-gl only inside useEffect so it never runs on server.
 */
export function MapCanvas({
  accessToken,
  containerRef,
  center,
  onLoaded,
  onError,
  onMarkerDragEnd,
}: MapCanvasProps) {
  const onLoadedRef = useRef(onLoaded);
  const onErrorRef = useRef(onError);
  const onDragRef = useRef(onMarkerDragEnd);
  onLoadedRef.current = onLoaded;
  onErrorRef.current = onError;
  onDragRef.current = onMarkerDragEnd;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !accessToken) return;

    let map: import("mapbox-gl").Map | null = null;
    let marker: import("mapbox-gl").Marker | null = null;

    import("mapbox-gl")
      .then((mapboxgl) => {
        const mb = mapboxgl.default;
        if (!mb.supported()) {
          onErrorRef.current("WebGL not supported");
          return;
        }
        mb.accessToken = accessToken;
        map = new mb.Map({
          container,
          style: "mapbox://styles/mapbox/light-v11",
          center: [center.lng, center.lat],
          zoom: 12,
        });
        marker = new mb.Marker({ draggable: true })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
        if (onDragRef.current) {
          marker.on("dragend", () => {
            const pos = marker!.getLngLat();
            onDragRef.current?.(pos.lat, pos.lng);
          });
        }
        map.addControl(new mb.NavigationControl(), "top-right");
        onLoadedRef.current();
      })
      .catch((err) => {
        const msg = err?.message ?? String(err);
        onErrorRef.current(msg);
      });

    return () => {
      marker?.remove();
      map?.remove();
    };
  // containerRef is stable ref object, not needed in deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, center.lat, center.lng]);

  return null;
}
