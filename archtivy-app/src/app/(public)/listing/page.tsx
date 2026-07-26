import { permanentRedirect } from "next/navigation";

/**
 * Legacy V1 index route: /listing.
 * 308 to the projects hub rather than 404 — it is a real navigational entry point
 * in the pre-migration index. See TECHNICAL_SEO_AUDIT.md C-2.
 */
export default function LegacyListingIndexPage() {
  permanentRedirect("/projects");
}
