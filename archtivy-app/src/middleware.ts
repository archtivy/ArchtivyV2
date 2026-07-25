import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isProductionMaintenance } from "@/lib/maintenance";

const clerk = clerkMiddleware();

/** Paths that must remain reachable during production maintenance. */
function isMaintenancePassthrough(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/og" || pathname.startsWith("/og/")) return true;
  if (pathname === "/logo" || pathname.startsWith("/logo/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return false;
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isProductionMaintenance() && !isMaintenancePassthrough(req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return clerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|otf)$).*)",
  ],
};
