import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDefaultProfileForClerkUserId } from "@/lib/db/profiles";
import { SitePage } from "@/components/layout/SitePage";

export const metadata: Metadata = {
  title: "Edit profile | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/profile — the header menu's "Edit Profile" destination.
 *
 * PLACEHOLDER, deliberately. No profile edit route existed anywhere in the app,
 * so the menu item needed a target that is not a 404. The real editing UI
 * arrives with the User Profile page; this page exists so the link can be
 * wired to its final path now rather than moved later.
 *
 * It shows no form and no disabled controls. A greyed-out edit form would read
 * as broken rather than unbuilt.
 */
export default async function EditProfilePlaceholderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/profile");

  const profileResult = await getDefaultProfileForClerkUserId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  return (
    <SitePage>
      <div className="max-w-xl">
        <h1 className="font-display text-[32px] font-medium tracking-tight text-ink">
          Edit profile
        </h1>
        <p className="mt-3 font-body text-[16px] leading-relaxed text-muted">
          Profile editing is being rebuilt as part of the new profile page. This
          page is the address it will live at — nothing has been removed.
        </p>
        <p className="mt-3 font-body text-[16px] leading-relaxed text-muted">
          Your public profile is live and unchanged in the meantime.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/u/${encodeURIComponent(profile.username)}`}
            className="inline-flex rounded-full bg-ink px-5 py-2.5 font-body text-[14px] text-cream transition-opacity hover:opacity-90"
          >
            View your profile
          </Link>
          <Link
            href="/me/settings"
            className="inline-flex rounded-full border border-ink/25 px-5 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/50"
          >
            Account settings
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
