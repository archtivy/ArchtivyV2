import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { SettingsAccount } from "./SettingsAccount";
import type { ProfileRole } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Settings | Archtivy",
  robots: { index: false, follow: false },
};

const ROLE_LABEL: Record<ProfileRole, string> = {
  designer: "Designer",
  brand: "Brand",
  reader: "Reader",
  admin: "Admin",
};

/**
 * /me/settings — account-level settings, restyled into the workspace.
 *
 * ── ACCOUNT, NOT PROFILE ────────────────────────────────────────────────────
 * Avatar, bio, location and links stay in Edit Profile. This page holds the
 * things that are about the ACCOUNT: identity, security, notifications and
 * account lifecycle. It draws no chrome of its own — the shell owns that — and
 * the old Profile/Account tab pair is gone, because with profile editing living
 * elsewhere there was only ever one real tab.
 */
export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/settings");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const roleLabel = ROLE_LABEL[profile.role as ProfileRole];
  const publicUrl = profile.username
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${encodeURIComponent(profile.username)}`
    : "";

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">Settings</h1>
      <p className="mt-2 font-body text-[15px] text-muted">
        Manage your account, security and notifications.
      </p>

      <SettingsAccount
        username={profile.username}
        roleLabel={roleLabel}
        publicUrl={publicUrl}
      />

      <p className="mt-8 font-body text-[13px] text-muted">
        Looking for your photo, bio or links?{" "}
        <Link href="/me/profile" className="text-ink underline-offset-4 hover:underline">
          Edit your profile
        </Link>
        .
      </p>
    </div>
  );
}
