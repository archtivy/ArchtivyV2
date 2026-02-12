import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { PageContainer } from "@/components/layout/PageContainer";
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
      <PageContainer>
        <div className="mx-auto max-w-md py-8">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Invalid or missing claim link
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Use the exact link from your email or from an admin.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-archtivy-primary hover:underline"
            >
              Back to home
            </Link>
          </div>
        </div>
      </PageContainer>
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
    <PageContainer>
      <div className="mx-auto max-w-md py-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{result.error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-archtivy-primary hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
