"use client";

import { ShareCTA } from "@/components/layout/ShareCTA";
import Link from "next/link";
import type { ProfileRole } from "@/lib/auth/config";

interface AboutCTAsProps {
  userId: string | null;
  role: ProfileRole | undefined;
}

export function AboutCTAs({ userId, role }: AboutCTAsProps) {
  return (
    <>
      <ShareCTA userId={userId} role={role} tone="editorial" />
      <Link
        href="/projects"
        className="inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 font-body text-[14px] text-ink transition-colors hover:bg-stone/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-archtivy-primary focus-visible:ring-offset-2"
      >
        Explore projects
      </Link>
    </>
  );
}
