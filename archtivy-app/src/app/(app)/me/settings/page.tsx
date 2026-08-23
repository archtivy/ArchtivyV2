import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { SettingsAccount } from "./SettingsAccount";
import type { ProfileRole } from "@/lib/auth/config";
import { SitePage } from "@/components/layout/SitePage";
import { PageHeading } from "@/components/layout/PageHeading";

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
    <SitePage>
      <PageHeading
        eyebrow="Your account"
        title="Settings"
        description="Manage your account and profile."
      />

      <nav className="mt-10 flex gap-1 border-b border-hairline" aria-label="Settings tabs">
        <TabLink href="/me/settings?tab=profile" active={tab === "profile"}>
          Profile
        </TabLink>
        <TabLink href="/me/settings?tab=account" active={tab === "account"}>
          Account
        </TabLink>
      </nav>

      {tab === "profile" && (
        <div className="mt-8 space-y-6">
          <div>
            <h3 className="font-body text-[13px] font-medium uppercase tracking-[0.1em] text-muted">
              Username / slug
            </h3>
            <p className="mt-1 font-body text-[15px] text-ink">{profile.username ?? "—"}</p>
          </div>
          <div>
            <h3 className="font-body text-[13px] font-medium uppercase tracking-[0.1em] text-muted">
              Role
            </h3>
            <p className="mt-1 font-body text-[15px] text-ink">{roleLabel}</p>
          </div>
          <div>
            <h3 className="font-body text-[13px] font-medium uppercase tracking-[0.1em] text-muted">
              Public profile link
            </h3>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block font-body text-[15px] text-ink underline-offset-4 hover:underline"
              >
                {publicUrl}
              </a>
            ) : (
              <p className="mt-1 font-body text-[15px] text-muted">—</p>
            )}
          </div>
        </div>
      )}

      {tab === "account" && (
        <div className="mt-8">
          <SettingsAccount />
        </div>
      )}
    </SitePage>
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
      className={`-mb-px border-b-2 px-3 py-2 font-body text-[14px] transition-colors ${
        active
          ? "border-ink text-ink"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
