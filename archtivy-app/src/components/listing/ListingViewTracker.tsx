"use client";

import { useEffect } from "react";
import { track } from "@/lib/events";

export function ListingViewTracker({
  type,
  id,
}: {
  type: "project" | "product";
  id: string;
}) {
  useEffect(() => {
    track("listing_view", { type, id });
  }, [type, id]);
  return null;
}
