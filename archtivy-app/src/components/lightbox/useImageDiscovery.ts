"use client";

import { useEffect, useRef, useState } from "react";

/** Mirrors lib/discovery/visualDiscovery.ts. Geometry and products, nothing else. */
export interface FeedProduct {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  brandName: string | null;
}

export interface DiscoveryRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  exact: FeedProduct[];
  similar: FeedProduct[];
}

export interface ImageDiscovery {
  imageId: string;
  listingType: "project" | "product";
  room: { exact: FeedProduct[]; similar: FeedProduct[] };
  regions: DiscoveryRegion[];
}

/**
 * The discovery payload for the photograph currently on screen.
 *
 * ── ONE REQUEST PER IMAGE, THEN NOTHING ─────────────────────────────────────
 * Regions and their products arrive together, so clicking an object in the
 * photograph is a pure state change: no fetch, no spinner, no model. Results
 * are kept per image id for the life of the lightbox, so paging back to a
 * slide already seen is instant and costs no second request.
 *
 * Failure is silent by design. This feature is discovery layered over a
 * gallery; if it cannot load, the reader should see the photograph and the
 * project's own details, not an error about a recommendation engine.
 */
export function useImageDiscovery(imageId: string | undefined): {
  data: ImageDiscovery | null;
  loading: boolean;
} {
  const cache = useRef(new Map<string, ImageDiscovery>());
  const [data, setData] = useState<ImageDiscovery | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageId) {
      setData(null);
      setLoading(false);
      return;
    }

    const cached = cache.current.get(imageId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    // Clear rather than keep the previous slide's feed on screen: showing one
    // photograph's products beside a different photograph is worse than a gap.
    setData(null);

    fetch(`/api/discovery/image/${imageId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ImageDiscovery | null) => {
        if (controller.signal.aborted || !json) return;
        cache.current.set(imageId, json);
        setData(json);
      })
      .catch(() => {
        /* Aborted, offline, or a 500. Either way: no feed, no error UI. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [imageId]);

  return { data, loading };
}
