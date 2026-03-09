"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/follows";
import type { FollowTargetType } from "@/lib/db/follows";

interface FollowButtonProps {
  targetType: FollowTargetType;
  targetId: string;
  initialFollowing: boolean;
  className?: string;
}

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

  const label = following
    ? hovering
      ? "Unfollow"
      : "Following"
    : "Follow";

  const stateClasses = following
    ? hovering
      ? "border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
      : "border-[#002abf] text-[#002abf] dark:border-[#5b7cff] dark:text-[#5b7cff]"
    : "border-zinc-200 bg-white text-zinc-700 hover:border-[#002abf] hover:text-[#002abf] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-[#5b7cff] dark:hover:text-[#5b7cff]";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={isPending}
      className={`inline-flex items-center justify-center rounded-full h-9 border px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50 ${stateClasses} ${className ?? ""}`}
    >
      {label}
    </button>
  );
}
