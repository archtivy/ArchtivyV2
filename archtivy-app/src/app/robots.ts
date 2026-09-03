import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";

/**
 * Robots.txt: disallow private routes (admin, dashboard, auth, add flows).
 * Per-page robots meta is set in route layouts and generateMetadata (e.g. hidden profiles).
 */
export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/me/",
          "/add/",
          "/onboarding/",
          "/complete-profile/",
          "/welcome",
          "/sign-in",
          "/sign-up",
          "/api/",
          // Universal search results. Every query is a distinct URL over
          // content already indexed at its own canonical address, so crawling
          // them spends budget to create duplicates. The page also sets
          // robots: noindex itself; this stops the fetch as well as the index.
          "/search",
          "/debug/",
          "/test/",
          // Claim flows are transient form pages; exclude from indexing
          "/claim",
          "/u/*/claim",
          "/u/id/*/claim",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
