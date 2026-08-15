import { permanentRedirect } from "next/navigation";

/**
 * /explore/designers -> /designers (308).
 *
 * The designer index moved to a top-level route to match the nav and to sit
 * alongside /projects and /products. Redirecting rather than leaving both live
 * keeps one canonical URL and avoids a duplicate index; permanentRedirect also
 * passes the old URL's accumulated link equity to the new one.
 *
 * The previous implementation rendered ProfileDirectoryClient over
 * getProfileDirectoryByRoleCached("designer"). Once /explore/brands was also
 * redirected, that whole cluster lost its last caller — logged for deletion in
 * DATA_INTEGRITY_LOG.md rather than removed here, to keep this a pure routing
 * change. It was also the source of the soft-deleted profiles that used to be
 * listed on this page; the new data layer excludes them.
 */
export default function ExploreDesignersRedirect() {
  permanentRedirect("/designers");
}
