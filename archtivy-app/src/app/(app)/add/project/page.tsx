import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createProject } from "@/app/actions/createProject";
import { AddProjectForm } from "./AddProjectForm";
import { Button } from "@/components/ui/Button";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getProjectMaterialOptions } from "@/lib/db/materials";
import { getListingsByOwner } from "@/lib/db/listings";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { OnboardingSteps } from "@/components/onboarding/OnboardingSteps";
import type { MemberTitleRow } from "./TeamMembersField";

async function getActiveMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .order("maps_to_role", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[member_titles] fetch error:", error.message);
    }
    return [];
  }
  return (data ?? []) as MemberTitleRow[];
}

export default async function AddProjectPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=" + encodeURIComponent("/add/project"));
  }
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    redirect("/onboarding");
  }

  const { data: listings } = await getListingsByOwner(userId);
  const listingsCount = listings?.length ?? 0;
  const showOnboarding = listingsCount === 0;

  const [materialOptions, memberTitles] = await Promise.all([
    getProjectMaterialOptions(),
    getActiveMemberTitles(),
  ]);
  const materials = materialOptions ?? [];

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="space-y-8">
      {showOnboarding && (
        <OnboardingSteps />
      )}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Add project
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new project listing. Save draft anytime or publish when ready.
        </p>
        <p className="mt-2">
          <Button as="link" href="/explore/projects" variant="link">
            ← Back to projects
          </Button>
        </p>
      </div>
      <AddProjectForm materials={materials} memberTitles={memberTitles} />
        </div>
      </div>
    </div>
  );
}
