import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";

export default async function MePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const profileResult = await getDefaultProfileForClerkUserId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    redirect("/onboarding");
  }

  redirect(`/u/${encodeURIComponent(profile.username)}`);
}
