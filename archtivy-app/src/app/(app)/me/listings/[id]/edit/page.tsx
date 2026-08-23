import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getListingForEdit } from "@/lib/db/listingEdit";
import { canManageListing } from "@/lib/auth/listingOwnership";
import {
  getWizardCategories,
  getWizardMaterials,
  getWizardProducts,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";
import { ProjectWizard } from "@/app/(app)/add/project/ProjectWizard";
import { ProductWizard } from "@/app/(app)/add/product/ProductWizard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Edit listing | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/listings/[id]/edit — the owner-side edit surface.
 *
 * Renders the SAME wizard as /add/*, prefilled. A separate edit form would be
 * a second place to add every future field to, and the two would drift within
 * a release.
 *
 * ── ORDER OF GUARDS MATTERS ─────────────────────────────────────────────────
 * Ownership is checked before anything is rendered, and a failure is notFound()
 * rather than a redirect with a message: whether a given listing id exists is
 * not something a non-owner should be able to probe.
 */
export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  // ?step=N arrives from a dashboard draft card that named a specific missing
  // field. Parsed loosely — a bad value falls back to step 0 rather than 404s,
  // since the step is a convenience and the listing is the point.
  const { step: stepParam } = await searchParams;
  const parsedStep = Number.parseInt(stepParam ?? "", 10);
  const initialStep = Number.isFinite(parsedStep) && parsedStep >= 0 ? parsedStep : undefined;

  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/me/listings/${id}/edit`);

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");
  if (profile.role === "reader") redirect("/me/settings");

  const listing = await getListingForEdit(id);
  if (!listing) notFound();

  // Both columns, via the shared predicate — 118 of 129 live listings carry
  // only owner_profile_id, so a Clerk-id-only check would 404 their owners.
  const owns = canManageListing(
    {
      owner_clerk_user_id: listing.ownerClerkUserId,
      owner_profile_id: listing.ownerProfileId,
    },
    userId,
    profile.id ?? null
  );
  if (!owns) notFound();

  if (listing.type === "product") {
    const [categories, materials] = await Promise.all([
      getWizardCategories("product"),
      getWizardMaterials(),
    ]);
    return (
      <ProductWizard
        categories={categories}
        materials={materials}
        brandName={profile.display_name?.trim() || profile.username || null}
        initial={listing}
        initialStep={initialStep}
      />
    );
  }

  const [categories, materials, products, memberTitles] = await Promise.all([
    getWizardCategories("project"),
    getWizardMaterials(),
    getWizardProducts(),
    getWizardMemberTitles(),
  ]);
  return (
    <ProjectWizard
      categories={categories}
      materials={materials}
      products={products}
      memberTitles={memberTitles}
      initial={listing}
      initialStep={initialStep}
    />
  );
}
