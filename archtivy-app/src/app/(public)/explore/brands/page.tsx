import { permanentRedirect } from "next/navigation";

/**
 * /explore/brands -> /brands (308).
 *
 * Same move already made for /explore/designers: the directory is now a
 * top-level route matching the nav, and one canonical URL beats two competing
 * indexes. permanentRedirect passes the old URL's link equity forward.
 *
 * This retires the last caller of getProfileDirectoryByRoleCached in the public
 * app. That fetcher and ProfileDirectoryClient are now unreferenced by any
 * route — worth deleting, but left in place here so this change stays a pure
 * routing swap. See DATA_INTEGRITY_LOG.md for the deleted_at fix it carries.
 */
export default function ExploreBrandsRedirect() {
  permanentRedirect("/brands");
}
