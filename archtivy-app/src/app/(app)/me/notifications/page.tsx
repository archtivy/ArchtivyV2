import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNotificationsForProfile } from "@/lib/db/notifications";
import { NetworkUpdatesList } from "@/components/notifications/NetworkUpdatesList";

export default async function NotificationsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) redirect("/onboarding");

  const result = await getNotificationsForProfile(profile.id, { limit: 50, offset: 0 });
  const items = result.data?.items ?? [];
  const total = result.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Network Updates
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Activity from designers, brands, and categories you follow.
        </p>
      </div>

      <NetworkUpdatesList initialItems={items} initialTotal={total} />
    </div>
  );
}
