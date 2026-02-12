import Link from "next/link";

const LAST_UPDATED = "2025-02-02";

export const metadata = {
  title: "Terms of use | Archtivy",
  description: "Terms of use for Archtivy. Please review before using the platform.",
};

export default function TermsPage() {
  return (
    <article className="space-y-20 sm:space-y-28">
      <header className="space-y-6 pt-4 sm:pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Legal
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Terms of use
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Last updated: {LAST_UPDATED}. This is a template and should be reviewed by legal counsel before use.
        </p>
      </header>

      <section className="space-y-8 border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            1. Acceptance of terms
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            By accessing or using Archtivy (the platform), you agree to be bound by these Terms of Use. If you do not agree, do not use the platform.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            2. Use of the platform
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            You may use Archtivy to publish and explore projects, products, and related content. You are responsible for the accuracy of the content you add and for complying with applicable laws. You must not use the platform for illegal, misleading, or harmful purposes.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            3. Your content
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            You retain ownership of content you submit. By submitting content, you grant Archtivy a licence to display, store, and use it in connection with operating the platform. You represent that you have the rights to post such content and that it does not infringe third-party rights.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            4. Account and conduct
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            You are responsible for keeping your account secure. You must not share credentials or allow others to use your account. We may suspend or terminate accounts that violate these terms or our Guidelines.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            5. Disclaimer
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            The platform is provided as is. We do not guarantee uninterrupted or error-free service. Content on the platform is provided by users; we do not verify its accuracy or completeness.
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            6. Changes
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
            We may update these terms from time to time. We will indicate the last updated date. Continued use of the platform after changes constitutes acceptance of the updated terms.
          </p>
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-16 dark:border-zinc-800 sm:pt-20">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <Link href="/" className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
            Back to home
          </Link>
          {" · "}
          <Link href="/privacy" className="text-archtivy-primary hover:underline dark:text-archtivy-primary">
            Privacy
          </Link>
        </p>
      </section>
    </article>
  );
}
