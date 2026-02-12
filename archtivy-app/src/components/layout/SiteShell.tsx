"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Footer } from "@/components/layout/Footer";

// Routes that should render "shellless" (no public TopNav/Footer/PageContainer).
// Admin has its own layout + navigation, so treat it like auth/onboarding here.
const AUTH_PATH_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/complete-profile", "/admin"];

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface SiteShellProps {
  children: React.ReactNode;
}

/**
 * For auth/onboarding routes: render children only in a fullscreen wrapper (no Header, no Footer, no PageContainer).
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

  return (
    <>
      <TopNav />
      <main>
        <PageContainer>{children}</PageContainer>
      </main>
    </>
  );
}
