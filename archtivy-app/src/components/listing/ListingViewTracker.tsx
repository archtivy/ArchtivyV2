"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/events";

export function ListingViewTracker({
  type,
  id,
}: {
  type: "project" | "product";
  id: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!id || sent.current) return;
    sent.current = true;
    track("listing_view", { type, id });
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    }).catch(() => {});
  }, [id, type]);
  return null;
}
