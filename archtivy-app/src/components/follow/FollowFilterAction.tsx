"use client";

import { useState, useTransition } from "react";
import { toggleFollowTaxonomy } from "@/app/actions/follows";
import type { TaxonomyFollowTarget } from "@/lib/follows/taxonomyFollowKeys";

interface FollowFilterActionProps {
  target: TaxonomyFollowTarget;
  /** Current follow state, owned by the parent (see useTaxonomyFollowStates). */
  following: boolean;
  /** Report the new state back so the parent's map stays in sync. */
  onChange: (target: TaxonomyFollowTarget, following: boolean) => void;
  /** Appended to the aria-label so several controls are distinguishable. */
  label?: string;
}

/**
 * Compact follow/following toggle for one active filter chip.
 *
 * CONTROLLED BY DESIGN. This used to fetch its own state on mount, which was
 * fine while it appeared at most once per page — the old rule showed it only
 * when exactly one category or material was selected. Now that there is one per
 * active chip, self-fetching would issue a request per chip for what is a single
 * question about a single user, so the parent resolves them all in one call and
 * passes the answer down.
 *
 * Rendering is the parent's decision too: it omits the control entirely while
 * state is unknown or the visitor is signed out.
 */
export function FollowFilterAction({
  target,
  following,
  onChange,
  label,
}: FollowFilterActionProps) {
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startTransition(async () => {
      const result = await toggleFollowTaxonomy(
        target.targetType,
        target.slugPath,
        target.domain
      );
      if (!result.error) onChange(target, result.following);
    });
  };

  const text = following ? (hovering ? "Unfollow" : "Following") : "Follow";
  const describes = label ? `${label} ${target.targetType}` : `this ${target.targetType}`;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      disabled={isPending}
      className={`shrink-0 rounded-full px-1.5 text-[10px] font-medium transition focus:outline-none focus:ring-1 focus:ring-[#173DED] disabled:opacity-50 ${
        following
          ? hovering
            ? "text-zinc-400 hover:text-zinc-500"
            : "text-[#173DED] dark:text-[#5b7cff]"
          : "text-zinc-400 hover:text-[#173DED] dark:hover:text-[#5b7cff]"
      }`}
      aria-pressed={following}
      aria-label={`${text} ${describes}`}
    >
      {text}
    </button>
  );
}
