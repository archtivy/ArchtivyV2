import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AddProductForm } from "./AddProductForm";
import { Button } from "@/components/ui/Button";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getProductMaterialOptions } from "@/lib/db/materials";
import { getListingsByOwner } from "@/lib/db/listings";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { OnboardingSteps } from "@/components/onboarding/OnboardingSteps";
import type { MemberTitleRow } from "../project/TeamMembersField";

async function getActiveBrandMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .eq("maps_to_role", "brand")
    .order("sort_order", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[member_titles] brand fetch error:", error.message);
    }
    return [];
  }
  return (data ?? []) as MemberTitleRow[];
}

export default async function AddProductPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=" + encodeURIComponent("/add/product"));
  }
  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) {
    redirect("/onboarding");
  }
  if (profile.role !== "brand") {
    redirect("/me");
  }

  const { data: listings } = await getListingsByOwner(userId);
  const listingsCount = listings?.length ?? 0;
  const showOnboarding = listingsCount === 0;

  const [materialOptions, memberTitles] = await Promise.all([
    getProductMaterialOptions(),
    getActiveBrandMemberTitles(),
  ]);
  const materials = materialOptions ?? [];

  return (
    <div className="space-y-8">
      {showOnboarding && (
        <OnboardingSteps />
      )}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Add product
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Create a new product listing. Use the checklist to track progress. Save draft anytime or publish when ready.
        </p>
        <p className="mt-2">
          <Button as="link" href="/explore/products" variant="link">
            ← Back to products
          </Button>
        </p>
      </div>
      <AddProductForm materials={materials} memberTitles={memberTitles} />
    </div>
  );
}
