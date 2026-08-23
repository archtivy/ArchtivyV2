import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByClerkId } from "@/lib/db/profiles";
// Reference-data queries live in lib/publish/wizardReferenceData so the edit
// route feeds the same wizard from the same source; see the note there.
import {
  getWizardCategories,
  getWizardMaterials,
  getWizardProducts,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";
import { ProjectWizard } from "./ProjectWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share your work | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /add/project — the nine-step publish wizard (Build Brief §2).
 *
 * The server half only loads reference data. Everything else — validation,
 * slug, taxonomy, geo, team, materials, rollback — stays in the existing
 * createProject action, which the wizard posts the same FormData to. That was
 * the constraint: restructure the surface, not the write path.
 */

export default async function AddProjectPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/add/project");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile?.username) redirect("/onboarding");
  // Readers do not publish. createProjectCanonical already refuses them, but
  // only after the wizard has been filled in and submitted — this turns a
  // dead-end at the last step into never opening the form at all.
  if (profile.role === "reader") redirect("/me/settings");

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
    />
  );
}
