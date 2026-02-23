import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { PageCTA } from "@/components/layout/PageCTA";

const CONTACT_EMAIL = "info@archtivy.com";

export const metadata = {
  title: "Contact | Archtivy",
  description: "Get in touch with Archtivy. Questions about the platform, partnerships, or support.",
};

export default async function ContactPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 text-center sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Contact
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Get in touch
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Have a question about Archtivy, your account, or how to link projects and products? We&apos;re here to help.
        </p>
      </header>

      <section className="mx-auto max-w-xl space-y-8 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Email
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            For general inquiries, platform support, or partnership discussions, reach us at:
          </p>
          <p className="mt-4">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-16 text-center dark:border-zinc-800 sm:pt-20">
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Ready to share your work or explore what&apos;s on the platform?
        </p>
        <PageCTA userId={userId} role={role} />
      </section>
    </article>
  );
}
