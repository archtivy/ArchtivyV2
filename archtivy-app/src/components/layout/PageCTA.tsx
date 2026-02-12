"use client";

import { ShareCTA } from "@/components/layout/ShareCTA";
import { Button } from "@/components/ui/Button";

import type { ProfileRole } from "@/lib/auth/config";

interface PageCTAProps {
  userId: string | null;
  role: ProfileRole | undefined;
}

export function PageCTA({ userId, role }: PageCTAProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <ShareCTA userId={userId} role={role} />
      <Button as="link" href="/explore/projects" variant="secondary">
        Explore projects
      </Button>
    </div>
  );
}
