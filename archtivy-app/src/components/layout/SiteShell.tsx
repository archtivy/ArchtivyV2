"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Footer } from "@/components/layout/Footer";
import { ExploreToolHeader } from "@/components/explore/ExploreToolHeader";

// Routes that should render "shellless" (no public TopNav/Footer/PageContainer).
// Admin has its own layout + navigation, so treat it like auth/onboarding here.
const AUTH_PATH_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/complete-profile", "/admin"];

// Routes that show a minimal tool header (no main site nav).
const TOOL_PATHS = ["/explore"];

// Routes that show TopNav but skip PageContainer (full-width content).
const FULL_WIDTH_PATHS: string[] = [];

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isToolRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return TOOL_PATHS.some((p) => pathname === p);
}

function isFullWidthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return FULL_WIDTH_PATHS.some((p) => pathname === p);
}

interface SiteShellProps {
  children: React.ReactNode;
}

/**
 * For auth/onboarding routes: render children only in a fullscreen wrapper (no Header, no Footer, no PageContainer).
 * For tool routes (/explore): render minimal ExploreToolHeader + children (no footer).
 * For all other routes: render TopNav + main + PageContainer + children + Footer.
 */
export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const auth = isAuthRoute(pathname);

  if (auth) {
    return (
      <div className="min-h-screen w-full" style={{ minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  if (isToolRoute(pathname)) {
    return (
      <div className="flex h-screen flex-col">
        <ExploreToolHeader />
        <main className="relative min-h-0 flex-1">{children}</main>
      </div>
    );
  }

  if (isFullWidthRoute(pathname)) {
    return (
      <>
        <TopNav />
        <main>{children}</main>
      </>
    );
  }

  const isHome = pathname === "/";

  return (
    <>
      <TopNav />
      <main>
        <PageContainer className={isHome ? "!pt-0" : undefined}>{children}</PageContainer>
      </main>
    </>
  );
}
