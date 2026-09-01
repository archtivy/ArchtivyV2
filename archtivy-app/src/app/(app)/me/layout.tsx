import { auth } from "@clerk/nextjs/server";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";
import { MeWorkspaceShell } from "@/components/me/MeWorkspaceShell";

/**
 * Wraps every /me route, but only DRESSES the five management destinations.
 *
 * ── WHY IT SPANS ALL OF /me WHEN IT ONLY STYLES FIVE ────────────────────────
 * Next applies a layout to its whole subtree; there is no "some children" form.
 * The alternative was moving dashboard/, listings/, settings/ into a
 * (workspace) route group — URL-transparent, but it drags /me/listings/[id]
 * and the publish wizard along with the directory, and those must not gain a
 * sidebar. So the subtree is wide and the DECISION is narrow: MeWorkspaceShell
 * returns children untouched for anything outside the workspace set, which
 * leaves /me/saved, /me/files, /me/profile, /me/following, /me/notifications
 * and the wizard rendering byte-identically to before.
 *
 * ── NO REDIRECT HERE ────────────────────────────────────────────────────────
 * Each page already runs its own auth() + onboarding redirect, and they do not
 * agree on where to send a signed-out visitor (/sign-in vs a redirect_url back
 * to the page). Duplicating that decision in the layout would make the layout
 * the one that wins, silently changing five pages' sign-in behaviour. The
 * layout only needs a username for the "View public profile" link, and is
 * content for it to be null.
 */
export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  const profile = userId ? (await getDefaultProfileForClerkUserId(userId)).data : null;

  return (
    <MeWorkspaceShell username={profile?.username ?? null}>{children}</MeWorkspaceShell>
  );
}
