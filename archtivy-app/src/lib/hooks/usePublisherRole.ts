"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Is the signed-in account allowed to publish listings?
 *
 * The two headers are client components and Clerk's session carries no profile
 * role, so the role has to come from /api/user-profile-data. TopNav already did
 * exactly this fetch and derived `showListings` from it; this hook is that same
 * logic extracted so HomeNav gates on the same source rather than a third copy
 * that can drift.
 *
 * ── DEFAULTS TO FALSE ───────────────────────────────────────────────────────
 * `canPublish` is false until the role is known, so the create affordance
 * appears when a role earns it rather than being shown to everyone and then
 * retracted from readers. A brief absence for a designer is the acceptable
 * direction; flashing a button a reader can never use is not.
 *
 * This is a CONVENIENCE, not a security boundary. Both wizard routes and both
 * create actions enforce the same rule server-side.
 */
export function usePublisherRole(): {
  role: string | undefined;
  canPublish: boolean;
  loaded: boolean;
} {
  const { isLoaded, isSignedIn } = useAuth();
  const [role, setRole] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setRole(undefined);
      setLoaded(isLoaded);
      return;
    }
    let cancelled = false;
    fetch("/api/user-profile-data")
      .then((res) => res.json())
      .then((data: { role?: string }) => {
        if (cancelled) return;
        setRole(data.role);
        setLoaded(true);
      })
      .catch(() => {
        // Leave the role unknown: canPublish stays false and the server-side
        // guards remain the real gate.
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return {
    role,
    canPublish: role === "designer" || role === "brand",
    loaded,
  };
}
