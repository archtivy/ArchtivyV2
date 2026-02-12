"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TopNavAuth } from "@/components/layout/TopNavAuth";
import { ShareCTA } from "@/components/layout/ShareCTA";
import { TopNavLinks } from "@/components/layout/TopNavLinks";

import type { ProfileRole } from "@/lib/auth/config";

interface ProfileData {
  userId: string | null;
  role: ProfileRole | undefined;
  displayName: string | null;
}

export function TopNav() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData>({
    userId: null,
    role: undefined,
    displayName: null,
  });

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setProfile({ userId: null, role: undefined, displayName: null });
      return;
    }
    let cancelled = false;
    fetch("/api/user-profile-data")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProfile({
          userId: data.userId ?? null,
          role: data.role,
          displayName: data.displayName ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({ userId: user.id, role: undefined, displayName: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  const userId = isLoaded && user?.id ? user.id : profile.userId ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        {/* Left: Logo + divider + nav links */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="shrink-0 rounded text-lg font-semibold text-zinc-900 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:text-zinc-100 dark:focus:ring-offset-zinc-950"
          >
            Archtivy
          </Link>
          <span
            className="h-5 w-px shrink-0 bg-zinc-300 dark:bg-zinc-600"
            aria-hidden
          />
          <nav className="flex items-center gap-1 text-sm sm:gap-4">
            <TopNavLinks />
          </nav>
        </div>
        {/* Right: Share CTA + auth + theme toggle */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <ShareCTA userId={userId} role={profile.role} />
          <TopNavAuth displayName={profile.displayName} role={profile.role} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
