import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { getPendingRequestByProfileAndUser } from "@/lib/db/profileClaimRequests";
import { ClaimProfileByIdForm } from "./ClaimProfileByIdForm";
import { SitePage } from "@/components/layout/SitePage";

export default async function ClaimProfileByIdPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const { userId } = await auth();
  if (!userId) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/u/id/${profileId}/claim`)}`
    );
  }

  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data;
  if (!profile) notFound();
  if ((profile as { is_hidden?: boolean }).is_hidden === true) notFound();

  const claimStatus = (profile as { claim_status?: string }).claim_status ?? "unclaimed";
  const username = profile.username?.trim() ?? null;

  if (claimStatus === "claimed") {
    if (username) {
      redirect(`/u/${encodeURIComponent(username)}`);
    }
    return (
      <ClaimShell>
        <div className="rounded-lg border border-hairline bg-stone/40 p-4">
          <p className="text-sm text-ink">
            This profile is already claimed.
          </p>
          <Link
            href={`/u/id/${profileId}`}
            className="mt-2 inline-block text-sm font-medium text-ink hover:underline"
          >
            ← Back to profile
          </Link>
        </div>
      </ClaimShell>
    );
  }

  const pendingResult = await getPendingRequestByProfileAndUser(profileId, userId);
  if (pendingResult.data) {
    return (
      <ClaimShell>
        <div className="rounded-lg border border-hairline bg-stone/40 p-4">
          <p className="text-sm text-ink">
            You already have a pending claim request for this profile.
          </p>
          <Link
            href={`/u/id/${profileId}`}
            className="mt-2 inline-block text-sm font-medium text-ink hover:underline"
          >
            ← Back to profile
          </Link>
        </div>
      </ClaimShell>
    );
  }

  const displayName =
    (profile.display_name ?? profile.username ?? "").trim() || "—";

  return (
    <ClaimShell>
      <h2 className="text-lg font-semibold text-ink">
        Request to claim this profile
      </h2>
      <p className="text-sm text-muted">
        Choose a username for &quot;{displayName}&quot;. An admin will review your request. If approved,
        your profile URL will be /u/your-username.
      </p>
      <ClaimProfileByIdForm profileId={profileId} displayName={displayName} />
      <Link
        href={`/u/id/${profileId}`}
        className="block text-sm font-medium text-muted hover:underline"
      >
        ← Back to profile
      </Link>
    </ClaimShell>
  );
}

/**
 * Every branch of this page is a short notice or a small form, and each one
 * used to return a bare <div> that leaned on the shell for its width and
 * chrome. With the shell gone they each need a frame, so the frame is named
 * once here rather than repeated at five early returns.
 */
function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <SitePage width="narrow">
      <div className="mx-auto max-w-lg space-y-4">{children}</div>
    </SitePage>
  );
}
