"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  taxonomyFollowKey,
  dedupeTaxonomyFollowTargets,
  type TaxonomyFollowTarget,
} from "@/lib/follows/taxonomyFollowKeys";

/**
 * Follow state for every active category/material filter, in one request.
 *
 * Ownership sits with the parent (the filter bar / sidebar) rather than with
 * each button, because the number of buttons is now driven by how many chips
 * are selected. Self-fetching buttons would mean N requests for what is one
 * question about one user.
 *
 * Returns null until the answer is known, or when signed out — callers render
 * no affordance at all in that state rather than a button that would flash
 * from "Follow" to "Following" once the response lands.
 */
export function useTaxonomyFollowStates(targets: TaxonomyFollowTarget[]) {
  const { isSignedIn, isLoaded } = useUser();
  const [states, setStates] = useState<Record<string, boolean> | null>(null);

  const unique = dedupeTaxonomyFollowTargets(targets);
  // The targets array is rebuilt on every render of the parent, so it can never
  // be a dependency directly. This signature changes only when the actual set
  // of chips changes.
  const signature = unique.map(taxonomyFollowKey).sort().join(",");

  // Kept in a ref so the effect can read the current targets without taking the
  // array itself as a dependency.
  const targetsRef = useRef(unique);
  targetsRef.current = unique;

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || signature === "") {
      setStates(null);
      return;
    }

    let cancelled = false;
    fetch("/api/follows/taxonomy-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets: targetsRef.current }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setStates((json?.states as Record<string, boolean>) ?? {});
      })
      .catch(() => {
        // Fail closed to "not followed" rather than hiding the control.
        if (!cancelled) setStates({});
      });

    return () => {
      cancelled = true;
    };
  }, [signature, isSignedIn, isLoaded]);

  /**
   * Apply the result of a toggle locally.
   *
   * Without this the button would keep rendering the pre-click state until the
   * next batch fetch, and the batch only refires when the chip SET changes —
   * which following something does not do.
   */
  const setOne = useCallback((target: TaxonomyFollowTarget, following: boolean) => {
    setStates((prev) => ({ ...(prev ?? {}), [taxonomyFollowKey(target)]: following }));
  }, []);

  return { states, setOne };
}
