import Link from "next/link";
import { MarketingPage, MarketingSection } from "@/components/marketing/MarketingPage";

const LAST_UPDATED = "2026-03-01";

export const metadata = {
  title: "Terms of Use | Archtivy",
  description:
    "Terms of use for Archtivy. Please review before using the platform.",
};

export default function TermsPage() {
  return (
    <MarketingPage
      label="Legal"
      headline="Terms of use."
      subheadline={`Last updated: ${LAST_UPDATED}. This document may be updated as the platform evolves.`}
    >
      <MarketingSection heading="1. Acceptance">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          By accessing or using Archtivy (&quot;the platform&quot;), you agree to be
          bound by these Terms of Use. If you do not agree, do not use the
          platform. These terms apply to all users, including professionals,
          brands, and visitors.
        </p>
      </MarketingSection>

      <MarketingSection heading="2. Permitted use">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            You may use Archtivy to publish and explore projects, products, and
            professional profiles. You are responsible for the accuracy and
            legality of the content you submit. The platform may only be used
            for lawful purposes.
          </p>
          <p>You must not use the platform to:</p>
          <ul className="space-y-2">
            {[
              "Publish false, misleading, or fraudulent content",
              "Infringe the intellectual property rights of any person or entity",
              "Harvest, scrape, or systematically extract platform data without permission",
              "Attempt to access systems or data you are not authorised to access",
              "Transmit malware, spam, or disruptive code",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      <MarketingSection heading="3. Your content">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            You retain ownership of the content you submit to Archtivy. By
            submitting content, you grant Archtivy a non-exclusive, worldwide,
            royalty-free licence to display, store, and use that content in
            connection with operating the platform and its services.
          </p>
          <p>
            You represent that you have the right to submit the content you
            publish, that it does not infringe third-party rights, and that it
            is accurate to the best of your knowledge. Credits attributed to
            other professionals must reflect genuine contributions.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="4. Account responsibilities">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            You are responsible for maintaining the security of your account
            credentials. Do not share your password or allow others to access
            your account. You are responsible for all activity that occurs under
            your account.
          </p>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these terms, post inaccurate credits, or engage in conduct harmful
            to the platform or its users.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="5. Intellectual property">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          The Archtivy platform, including its design, software, and structure,
          is owned by Archtivy Technologies, Inc. and protected by applicable
          intellectual property law. You may not reproduce, modify, or
          distribute any part of the platform without explicit written
          permission.
        </p>
      </MarketingSection>

      <MarketingSection heading="6. Disclaimer">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            The platform is provided &quot;as is&quot; without warranties of any kind.
            We do not guarantee uninterrupted or error-free service. Content on
            the platform is submitted by users; we do not independently verify
            its accuracy or completeness.
          </p>
          <p>
            To the maximum extent permitted by applicable law, Archtivy shall
            not be liable for any indirect, incidental, or consequential damages
            arising from your use of the platform.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="7. Governing law">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          These terms are governed by the laws of the State of California,
          United States. Any disputes shall be resolved in the courts of Los
          Angeles County, California.
        </p>
      </MarketingSection>

      <MarketingSection heading="8. Changes to these terms">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We may update these terms from time to time. The date at the top of
          this page indicates when they were last revised. Continued use of the
          platform after changes constitutes acceptance of the updated terms.
          For material changes, we will notify active users by email.
        </p>
      </MarketingSection>

      <MarketingSection>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
          <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Cookie Policy
          </Link>
          <span>·</span>
          <Link href="/data-processing" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Data Processing
          </Link>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
