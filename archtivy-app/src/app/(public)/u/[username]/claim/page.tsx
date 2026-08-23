import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getPendingRequestByProfileAndUser } from "@/lib/db/profileClaimRequests";
import { claimProfile } from "@/app/(public)/claim/_actions";
import { ClaimProfileForm } from "./ClaimProfileForm";
import { SitePage } from "@/components/layout/SitePage";

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
        <ClaimShell>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">{result.error}</p>
            <Link
              href={`/u/${encodeURIComponent(profileUsername)}`}
              className="mt-3 inline-block text-sm font-medium text-ink hover:underline"
            >
              Back to profile
            </Link>
          </div>
        </ClaimShell>
      );
    }

    if (result.profileId !== profileId) {
      return (
        <ClaimShell>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              This claim link is for a different profile.
            </p>
            <Link
              href={`/u/${encodeURIComponent(profileUsername)}`}
              className="mt-3 inline-block text-sm font-medium text-ink hover:underline"
            >
              Back to profile
            </Link>
          </div>
        </ClaimShell>
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
      <ClaimShell>
        <div className="rounded-lg border border-hairline bg-stone/40 p-4">
          <p className="text-sm text-ink">
            This profile is already claimed.
          </p>
          <Link
            href={`/u/${encodeURIComponent(profileUsername)}`}
            className="mt-2 inline-block text-sm font-medium text-ink hover:underline"
          >
            Back to profile
          </Link>
        </div>
      </ClaimShell>
    );
  }

  const pending = await getPendingRequestByProfileAndUser(profileId, userId);
  if (pending.data) {
    return (
      <ClaimShell>
        <div className="rounded-lg border border-hairline bg-stone/40 p-4">
          <p className="text-sm text-ink">
            You already have a pending claim request for this profile.
          </p>
          <Link
            href={`/u/${encodeURIComponent(profileUsername)}`}
            className="mt-2 inline-block text-sm font-medium text-ink hover:underline"
          >
            Back to profile
          </Link>
        </div>
      </ClaimShell>
    );
  }

  return (
    <ClaimShell>
      <h2 className="text-lg font-semibold text-ink">
        Claim this profile
      </h2>
      <p className="text-sm text-muted">
        Request to claim &quot;{profile.display_name ?? (profileUsername || "this profile")}&quot;.
        An admin will review your request.
      </p>
      <ClaimProfileForm profileId={profileId} />
      <Link
        href={`/u/${encodeURIComponent(profileUsername)}`}
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
