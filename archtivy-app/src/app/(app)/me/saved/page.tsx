import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SavedBoardsSection } from "./SavedBoardsSection";
import { SitePage } from "@/components/layout/SitePage";
import { PageHeading } from "@/components/layout/PageHeading";

export default async function SavedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <SitePage>
      <PageHeading
        eyebrow="Your account"
        title="Saved"
        description="Your boards. Create boards to organize saved projects and products."
      />
      <div className="mt-10">
        <SavedBoardsSection />
      </div>
    </SitePage>
  );
}
