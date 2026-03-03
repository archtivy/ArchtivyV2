import Link from "next/link";
import { MarketingPage, MarketingSection } from "@/components/marketing/MarketingPage";

const LAST_UPDATED = "2026-03-01";

export const metadata = {
  title: "Privacy Policy | Archtivy",
  description:
    "Archtivy privacy policy — what data we collect, how we use it, and your rights.",
};

export default function PrivacyPage() {
  return (
    <MarketingPage
      label="Legal"
      headline="Privacy policy."
      subheadline={`Last updated: ${LAST_UPDATED}. This document may be updated as the platform evolves. We recommend reviewing it periodically.`}
    >
      <MarketingSection heading="Overview">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Archtivy is operated by Archtivy Technologies, Inc. (&quot;Archtivy&quot;,
            &quot;we&quot;, &quot;us&quot;). This policy explains what personal data we collect
            when you use the platform, how we use it, and what rights you have
            in relation to that data.
          </p>
          <p>
            We do not sell personal data. We do not share your data with
            third parties except as necessary to operate the platform and as
            described in this policy.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Data we collect">
        <div className="space-y-4">
          {[
            {
              heading: "Account information",
              body: "When you create an account, we collect your email address, display name, username, and any profile information you choose to provide (bio, location, avatar). Authentication is handled by Clerk, which processes your credentials on our behalf.",
            },
            {
              heading: "Content you publish",
              body: "Projects, products, images, descriptions, team credits, and links you submit to the platform. This content is public and visible to all platform users unless you delete it.",
            },
            {
              heading: "Usage data",
              body: "Anonymised data about how you interact with the platform — pages visited, features used, and session duration. Collected via Vercel Analytics. This data does not identify individual users.",
            },
            {
              heading: "Technical data",
              body: "IP address, browser type, device type, and server request logs. Collected automatically by our infrastructure for security and performance purposes.",
            },
          ].map(({ heading, body }) => (
            <div key={heading} className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {heading}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection heading="How we use your data">
        <ul className="space-y-3">
          {[
            "To operate the platform and provide the services you have requested",
            "To display your profile, projects, and products to other users",
            "To send transactional messages related to your account (confirmations, notifications)",
            "To improve the platform through anonymised analytics",
            "To comply with applicable legal obligations",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
            >
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              {item}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection heading="What is public">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Your profile and the projects or products you publish are visible to
          anyone who accesses the platform, including search engines. Do not
          post information you do not want to be publicly visible. You can
          delete your content at any time, though some aggregated or anonymised
          data may be retained for analytical purposes.
        </p>
      </MarketingSection>

      <MarketingSection heading="Third-party services">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>We use the following third-party services to operate the platform:</p>
          <ul className="space-y-2">
            {[
              "Clerk — authentication and identity management",
              "Supabase — database and file storage",
              "Vercel — hosting and anonymised analytics",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {item}
              </li>
            ))}
          </ul>
          <p>
            Each provider processes data on our behalf under data processing
            agreements. We do not share your data with any other third parties
            without your consent, except where required by law.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Data retention">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We retain your account data for as long as your account is active or
          as needed to provide the service. If you delete your account, we will
          delete or anonymise your personal data within 30 days, subject to any
          legal retention obligations. Technical and usage data is retained for
          up to 12 months.
        </p>
      </MarketingSection>

      <MarketingSection heading="Your rights">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Depending on your location, you may have the following rights
            regarding your personal data:
          </p>
          <ul className="space-y-2">
            {[
              "Access — request a copy of the data we hold about you",
              "Rectification — request correction of inaccurate data",
              "Erasure — request deletion of your personal data",
              "Restriction — request that we limit processing in certain circumstances",
              "Portability — receive your data in a structured, machine-readable format",
              "Objection — object to processing based on legitimate interests",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {item}
              </li>
            ))}
          </ul>
          <p>
            To exercise any of these rights, contact{" "}
            <a
              href="mailto:info@archtivy.com"
              className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              info@archtivy.com
            </a>
            . We respond to all requests within 30 days.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Changes to this policy">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We may update this policy from time to time. The date at the top of
          this page indicates when it was last revised. Continued use of the
          platform after changes constitutes acceptance of the updated policy.
          For material changes, we will notify active users by email.
        </p>
      </MarketingSection>

      <MarketingSection>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
          <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Terms of Use
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
