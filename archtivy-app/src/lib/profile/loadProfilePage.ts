import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { isFollowing } from "@/lib/db/follows";
import { getProfilePageData } from "@/lib/db/profilePage";
import { getProfileMetrics } from "@/lib/db/profileMetrics";
import type { ProfilePageViewProps } from "@/components/profile/ProfilePageView";
import type { Profile } from "@/lib/types/profiles";

/**
 * Everything ProfilePageView needs, resolved once.
 *
 * Both /u/[username] and /u/id/[profileId] call this. Before, each route
 * resolved ownership, follow state and the contact listing itself, in ~420
 * lines apiece — so a fix to one silently left the other wrong, and since only
 * 41 of 199 profiles have a username, the id route was the one MOST visitors
 * actually hit.
 */
export async function loadProfilePageProps(
  profile: Profile
): Promise<Omit<ProfilePageViewProps, "profile">> {
  const { userId } = await auth();
  const ownerClerkId = (profile as { owner_user_id?: string | null }).owner_user_id;
  const isOwner = Boolean(
    userId && (userId === profile.clerk_user_id || userId === ownerClerkId)
  );

  const [data, metrics, initialFollowing] = await Promise.all([
    getProfilePageData(profile.id, profile.role),
    getProfileMetrics(profile.id),
    (async () => {
      // Only meaningful for a signed-in visitor who is not the owner.
      if (!userId || isOwner) return false;
      const viewer = await getProfileByClerkId(userId);
      if (!viewer.data) return false;
      return isFollowing(
        viewer.data.id,
        profile.role === "brand" ? "brand" : "designer",
        profile.id
      );
    })(),
  ]);

  // Seeds the contact dialog, which is written against a listing rather than a
  // profile. Null when this profile has published nothing — the button is then
  // omitted rather than opening a dialog with nothing to reference.
  const first = data.projects[0] ?? data.products[0] ?? null;

  return {
    data,
    metrics,
    isOwner,
    initialFollowing,
    contactListing: first
      ? { id: first.id, type: first.type, title: first.title }
      : null,
  };
}
