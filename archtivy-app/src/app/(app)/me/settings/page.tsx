import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { SettingsAccount } from "./SettingsAccount";
import type { ProfileRole } from "@/lib/auth/config";

const ROLE_LABEL: Record<ProfileRole, string> = {
  designer: "Designer",
  brand: "Brand",
  reader: "Reader",
  admin: "Admin",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");

  const rawTab = (await searchParams).tab ?? "profile";
  const tab = rawTab === "membership" ? "profile" : rawTab;
  const roleLabel = ROLE_LABEL[profile.role as ProfileRole];
  const publicUrl = profile.username
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/u/${encodeURIComponent(profile.username)}`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Settings
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your account and profile.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800" aria-label="Settings tabs">
        <TabLink href="/me/settings?tab=profile" active={tab === "profile"}>
          Profile
        </TabLink>
        <TabLink href="/me/settings?tab=account" active={tab === "account"}>
          Account
        </TabLink>
      </nav>

      {tab === "profile" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Username / slug</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {profile.username ?? "—"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Role</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{roleLabel}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Public profile link</h3>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm text-archtivy-primary hover:underline"
              >
                {publicUrl}
              </a>
            ) : (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">—</p>
            )}
          </div>
        </div>
      )}

      {tab === "account" && <SettingsAccount />}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? "border-archtivy-primary text-archtivy-primary"
          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
