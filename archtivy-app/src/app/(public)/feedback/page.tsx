import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";

const FEEDBACK_EMAIL = "hello@archtivy.com";

export const metadata = {
  title: "Feedback | Archtivy",
  description: "Share feedback about Archtivy. We use it to improve the platform.",
};

export default async function FeedbackPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Feedback
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Help us improve Archtivy
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your feedback shapes how we build the platform. Tell us what works, what does not, and what you need.
        </p>
      </header>

      <section className="mx-auto max-w-2xl space-y-10 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            How to share feedback
          </h2>
          <p className="mt-3 leading-relaxed text-zinc-600 dark:text-zinc-400">
            Email us at{" "}
            <a href={`mailto:${FEEDBACK_EMAIL}?subject=Archtivy%20feedback`} className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
              {FEEDBACK_EMAIL}
            </a>
            . Use the subject line &quot;Archtivy feedback&quot; so we can route it quickly. We read everything and use it to prioritise improvements.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            What feedback is most useful
          </h2>
          <ul className="list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
            <li>What you found confusing or missing when adding a project or product</li>
            <li>How you discover work and products today, and what would make it better</li>
            <li>Bugs or broken flows (include your browser and what you were doing)</li>
            <li>Ideas for features that would help designers and brands connect</li>
          </ul>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/contact" className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
            Contact
          </Link>{" "}
          for general inquiries or support.
        </p>
      </section>

      <section className="border-t border-zinc-200 pt-16 text-center dark:border-zinc-800 sm:pt-20">
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Ready to share your work or explore projects?
        </p>
        <PageCTA userId={userId} role={role} />
      </section>
    </article>
  );
}
