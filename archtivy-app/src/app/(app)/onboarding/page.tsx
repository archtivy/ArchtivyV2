import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth/config";
import { getProfileByClerkId, generateUsername } from "@/lib/db/profiles";
import { OnboardingForm } from "./OnboardingForm";
import { DESIGNER_TITLES, BRAND_TYPES, READER_TYPES } from "@/lib/auth/config";

export default async function OnboardingPage() {
  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (profile?.username && profile?.role) {
    redirect("/");
  }

  const user = await currentUser();
  const defaultDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || null
    : null;
  const defaultUsername = defaultDisplayName
    ? generateUsername(defaultDisplayName)
    : generateUsername("user");

  return (
    <OnboardingForm
      designerTitles={DESIGNER_TITLES}
      brandTypes={BRAND_TYPES}
      readerTypes={READER_TYPES}
      defaultDisplayName={defaultDisplayName}
      defaultUsername={defaultUsername}
    />
  );
}
