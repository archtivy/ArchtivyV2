import Link from "next/link";

const LAST_UPDATED = "2025-02-02";

export const metadata = {
  title: "Privacy policy | Archtivy",
  description: "Privacy policy for Archtivy. How we collect and use your information.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Privacy policy
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: {LAST_UPDATED}. This is a template and should be reviewed by legal counsel before use.
        </p>
      </header>

      <section className="space-y-8 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            1. Information we collect
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            We collect information you provide when you sign up and use Archtivy, such as your email, display name, username, profile details, and the content you add (projects, products, images, documents). We also collect technical data such as IP address and browser type in connection with providing the service.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            2. How we use it
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            We use your information to operate the platform, display your content, enable discovery and collaboration, communicate with you, and improve the service. We do not sell your personal information to third parties.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            3. What is public
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your profile and the projects or products you publish are visible to anyone who uses the platform. Do not post information you do not want to be public.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            4. Security and retention
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            We take reasonable steps to protect your data. We retain your information for as long as your account is active or as needed to provide the service and comply with legal obligations.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            5. Your rights
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            Depending on where you live, you may have rights to access, correct, or delete your personal data, or to object to certain processing. Contact us to exercise these rights.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            6. Changes
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            We may update this policy from time to time. We will indicate the last updated date. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
            Back to home
          </Link>
          {" · "}
          <Link href="/terms" className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
            Terms
          </Link>
        </p>
      </section>
    </article>
  );
}
