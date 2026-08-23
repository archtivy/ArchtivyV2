import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SitePage } from "@/components/layout/SitePage";
import { claimProfile } from "./_actions";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  if (!token) {
    return (
      <SitePage width="narrow">
        <div className="mx-auto max-w-md">
          <div className="rounded border border-hairline p-6">
            <p className="font-body text-[15px] font-medium text-ink">
              Invalid or missing claim link
            </p>
            <p className="mt-1 font-body text-[15px] leading-relaxed text-muted">
              Use the exact link from your email or from an admin.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block font-body text-[14px] text-ink underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>
        </div>
      </SitePage>
    );
  }

  const { userId } = await auth();
  if (!userId) {
    const claimUrl = `/claim?token=${encodeURIComponent(token)}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(claimUrl)}`);
  }

  const result = await claimProfile(token);

  if (result.ok) {
    const supabase = getSupabaseServiceClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", result.profileId)
      .maybeSingle();
    const username = (profile as { username: string | null } | null)?.username?.trim();
    if (username) {
      redirect(`/u/${encodeURIComponent(username)}`);
    }
    redirect("/me");
  }

  return (
    <SitePage width="narrow">
      <div className="mx-auto max-w-md">
        <div className="rounded border border-amber-300 bg-amber-50 p-6">
          <p className="font-body text-[15px] font-medium text-amber-900">{result.error}</p>
          <Link
            href="/"
            className="mt-4 inline-block font-body text-[14px] text-ink underline-offset-4 hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
