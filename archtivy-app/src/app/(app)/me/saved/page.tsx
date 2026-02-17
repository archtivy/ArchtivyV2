import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SavedBoardsSection } from "./SavedBoardsSection";

export default async function SavedPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Saved
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Your boards. Create boards to organize saved projects and products.
        </p>
      </div>

      <SavedBoardsSection />
    </div>
  );
}
