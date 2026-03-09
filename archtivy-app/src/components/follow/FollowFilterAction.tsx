"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { toggleFollowTaxonomy } from "@/app/actions/follows";

interface FollowFilterActionProps {
  /** "category" or "material" */
  targetType: "category" | "material";
  /** The taxonomy slug_path for the selected filter (e.g. "furniture/seating" or "concrete") */
  slugPath: string;
  /** Taxonomy domain: "product", "project", or "material" */
  domain: string;
}

/**
 * Compact follow/following toggle shown adjacent to an active Explore filter chip.
 * Only renders when the user is signed in. Fetches follow state on mount.
 */
export function FollowFilterAction({ targetType, slugPath, domain }: FollowFilterActionProps) {
  const { isSignedIn } = useUser();
  const [following, setFollowing] = useState<boolean | null>(null);
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchState = useCallback(() => {
    if (!isSignedIn) return;
    const params = new URLSearchParams({ targetType, slugPath, domain });
    fetch(`/api/follows/taxonomy-check?${params}`)
      .then((r) => r.json())
      .then((json) => setFollowing(json.following ?? false))
      .catch(() => setFollowing(false));
  }, [isSignedIn, targetType, slugPath, domain]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Don't render if not signed in or still loading
  if (!isSignedIn || following === null) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFollowTaxonomy(targetType, slugPath, domain);
      if (!result.error) {
        setFollowing(result.following);
      }
    });
  };

  const label = following
    ? hovering
      ? "Unfollow"
      : "Following"
    : "Follow";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={isPending}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition focus:outline-none disabled:opacity-50 ${
        following
          ? hovering
            ? "text-zinc-400 hover:text-zinc-500"
            : "text-[#002abf] dark:text-[#5b7cff]"
          : "text-zinc-400 hover:text-[#002abf] dark:hover:text-[#5b7cff]"
      }`}
      aria-label={`${label} this ${targetType}`}
    >
      {label}
    </button>
  );
}
