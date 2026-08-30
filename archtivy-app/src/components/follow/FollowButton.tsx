"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/follows";
import { BTN_PILL_PRIMARY, BTN_PILL_MUTED } from "@/components/ui/publicButton";
import type { FollowTargetType } from "@/lib/db/follows";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  initialFollowing: boolean;
  className?: string;
}

/**
 * Follow / Following / Unfollow.
 *
 * ── STYLING ONLY; THE BEHAVIOUR IS UNTOUCHED ────────────────────────────────
 * Same optimistic toggle, same server action, same hover-to-Unfollow label.
 * What changed is the paint: this was drawn in the pre-editorial system —
 * `border-zinc-200 bg-white text-zinc-700`, a hard-coded `#002abf` focus ring
 * and a full set of `dark:` variants — on a page that has no dark mode and no
 * zinc anywhere else. Beside a cream page in `ink` and `hairline` it read as a
 * control borrowed from another product.
 *
 * It now uses the public pill tokens, so it is the same height, radius, type
 * and focus treatment as Share on a project, Request quote on a product and
 * every button in the directory filter panel.
 *
 * Follow is the PRIMARY action on a profile, so it is solid. Following is not
 * a second call to action — it is a state — so it drops to the muted outline
 * and only firms up on hover, where it also becomes Unfollow.
 */
export function FollowButton({
  targetType,
  targetId,
  initialFollowing,
  className,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hovering, setHovering] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleFollow(targetType, targetId);
      if (!result.error) {
        setFollowing(result.following);
      }
    });
  };

  const label = following ? (hovering ? "Unfollow" : "Following") : "Follow";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={isPending}
      className={`${following ? BTN_PILL_MUTED : BTN_PILL_PRIMARY} ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
