import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getPendingRequestByProfileAndUser } from "@/lib/db/profileClaimRequests";
import { claimProfile } from "@/app/(public)/claim/_actions";
import { ClaimProfileForm } from "./ClaimProfileForm";

export default async function ClaimProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ username }, q] = await Promise.all([params, searchParams]);
  const token = typeof q?.token === "string" ? q.token.trim() : "";

  const decoded = decodeURIComponent(username);
  const profileResult = await getProfileByUsername(decoded);
  const profile = profileResult.data;
  if (!profile) notFound();

  const profileId = profile.id;
  const profileUsername = profile.username ?? "";

  // MODE A: token-based instant claim
  if (token) {
    const { userId } = await auth();
    if (!userId) {
      const claimUrl = `/u/${encodeURIComponent(decoded)}/claim?token=${encodeURIComponent(token)}`;
      redirect(`/sign-in?redirect_url=${encodeURIComponent(claimUrl)}`);
    }

    const result = await claimProfile(token);

    if (!result.ok) {
      return (
        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{result.error}</p>
            <Link
              href={`/u/${encodeURIComponent(profileUsername)}`}
              className="mt-3 inline-block text-sm font-medium text-archtivy-primary hover:underline"
            >
              Back to profile
            </Link>
          </div>
        </div>
      );
    }

    if (result.profileId !== profileId) {
      return (
        <div className="max-w-lg space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              This claim link is for a different profile.
            </p>
            <Link
              href={`/u/${encodeURIComponent(profileUsername)}`}
              className="mt-3 inline-block text-sm font-medium text-archtivy-primary hover:underline"
            >
              Back to profile
            </Link>
          </div>
        </div>
      );
    }

    redirect(`/u/${encodeURIComponent(profileUsername)}?claimed=1`);
  }

  // MODE B: request-based (no token)
  const { userId } = await auth();
  if (!userId) {
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(`/u/${encodeURIComponent(decoded)}/claim`)}`
    );
  }

  const claimStatus = (profile as { claim_status?: string }).claim_status ?? "unclaimed";
  const ownerUserId = (profile as { owner_user_id?: string | null }).owner_user_id ?? null;
  if (claimStatus === "claimed") {
    if (ownerUserId && ownerUserId === userId) {
      redirect(`/u/${encodeURIComponent(profileUsername)}`);
    }
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          This profile is already claimed.
        </p>
        <Link
          href={`/u/${encodeURIComponent(profileUsername)}`}
          className="mt-2 inline-block text-sm font-medium text-archtivy-primary hover:underline"
        >
          Back to profile
        </Link>
      </div>
    );
  }

  const pending = await getPendingRequestByProfileAndUser(profileId, userId);
  if (pending.data) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          You already have a pending claim request for this profile.
        </p>
        <Link
          href={`/u/${encodeURIComponent(profileUsername)}`}
          className="mt-2 inline-block text-sm font-medium text-archtivy-primary hover:underline"
        >
          Back to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Claim this profile
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Request to claim &quot;{profile.display_name ?? (profileUsername || "this profile")}&quot;.
        An admin will review your request.
      </p>
      <ClaimProfileForm profileId={profileId} />
      <Link
        href={`/u/${encodeURIComponent(profileUsername)}`}
        className="block text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Back to profile
      </Link>
    </div>
  );
}
