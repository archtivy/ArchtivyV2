import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { getPendingRequestByProfileAndUser } from "@/lib/db/profileClaimRequests";
import { ClaimProfileByIdForm } from "./ClaimProfileByIdForm";

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
      <div className="max-w-lg space-y-4">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            This profile is already claimed.
          </p>
          <Link
            href={`/u/id/${profileId}`}
            className="mt-2 inline-block text-sm font-medium text-archtivy-primary hover:underline"
          >
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const pendingResult = await getPendingRequestByProfileAndUser(profileId, userId);
  if (pendingResult.data) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            You already have a pending claim request for this profile.
          </p>
          <Link
            href={`/u/id/${profileId}`}
            className="mt-2 inline-block text-sm font-medium text-archtivy-primary hover:underline"
          >
            ← Back to profile
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    (profile.display_name ?? profile.username ?? "").trim() || "—";

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Request to claim this profile
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Choose a username for &quot;{displayName}&quot;. An admin will review your request. If approved,
        your profile URL will be /u/your-username.
      </p>
      <ClaimProfileByIdForm profileId={profileId} displayName={displayName} />
      <Link
        href={`/u/id/${profileId}`}
        className="block text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Back to profile
      </Link>
    </div>
  );
}
