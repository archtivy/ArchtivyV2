import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";

/**
 * Robots.txt: allow crawling of public pages; noindex,nofollow for admin and app (dashboard) routes.
 * Per-page noindex (e.g. /u/id/* unclaimed) is set in generateMetadata.
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
