import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";

/**
 * /me/profile → the owner's own profile, with the editor open.
 *
 * ── WHY A REDIRECT AND NOT A PAGE ───────────────────────────────────────────
 * This was a deliberate placeholder ("Profile editing is being rebuilt…") that
 * existed only so the account menu's "Edit Profile" item had a target that was
 * not a 404. The editor it was waiting for is now a drawer over the profile
 * itself, which is where editing belongs: the owner sees the page they are
 * changing while they change it.
 *
 * The route is KEPT rather than deleted because it is linked from
 * HeaderProfileMenu, TopNavAuth and the workspace Settings page, and may be
 * bookmarked. ?edit=1 is read client-side by ProfileOwnerControls, which opens
 * the drawer and then strips the param.
 *
 * Falls back to /u/id/[profileId] for the 158 of 199 profiles with no
 * username — that route renders the same page and the same drawer.
 */
export default async function EditProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/profile");

  const profile = (await getDefaultProfileForClerkUserId(userId)).data;
  if (!profile) redirect("/onboarding");

  redirect(
    profile.username
      ? `/u/${encodeURIComponent(profile.username)}?edit=1`
      : `/u/id/${profile.id}?edit=1`
  );
}
