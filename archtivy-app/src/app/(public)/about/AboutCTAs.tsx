"use client";

import { ShareCTA } from "@/components/layout/ShareCTA";
import { Button } from "@/components/ui/Button";
import type { ProfileRole } from "@/lib/auth/config";

interface AboutCTAsProps {
  userId: string | null;
  role: ProfileRole | undefined;
}

export function AboutCTAs({ userId, role }: AboutCTAsProps) {
  return (
    <>
      <ShareCTA userId={userId} role={role} />
      <Button as="link" href="/explore/projects" variant="secondary">
        Explore projects
      </Button>
    </>
  );
}
