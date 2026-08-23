import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getNotificationsForProfile } from "@/lib/db/notifications";
import { NetworkUpdatesList } from "@/components/notifications/NetworkUpdatesList";
import { SitePage } from "@/components/layout/SitePage";
import { PageHeading } from "@/components/layout/PageHeading";

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
    <SitePage>
      <PageHeading
        eyebrow="Your account"
        title="Network Updates"
        description="Activity from designers, brands, and categories you follow."
      />
      <div className="mt-10">
        <NetworkUpdatesList initialItems={items} initialTotal={total} />
      </div>
    </SitePage>
  );
}
