import Link from "next/link";
import { MarketingPage, MarketingSection } from "@/components/marketing/MarketingPage";

const LAST_UPDATED = "2026-03-01";

export const metadata = {
  title: "Data Processing | Archtivy",
  description:
    "How Archtivy processes personal data, legal bases, and your rights under applicable data protection law.",
};

export default function DataProcessingPage() {
  return (
    <MarketingPage
      label="Legal"
      headline="Data processing."
      subheadline={`Last updated: ${LAST_UPDATED}. This document may be updated as the platform and applicable regulations evolve.`}
    >
      <MarketingSection heading="Overview">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            This document describes how Archtivy processes personal data, the
            legal bases on which we rely, how long we retain data, and the
            rights available to individuals. It should be read alongside our{" "}
            <Link
              href="/privacy"
              className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            Archtivy is operated by Archtivy Technologies, Inc., based in Los
            Angeles, California. We process data in connection with operating the
            platform, providing our services, and complying with legal
            obligations.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Data we process">
        <div className="space-y-4">
          {[
            {
              category: "Account data",
              data: "Email address, display name, username, profile details (bio, location, avatar). Collected when you create an account.",
              basis: "Contract (necessary to provide the service)",
            },
            {
              category: "Content data",
              data: "Projects, products, images, descriptions, credits, and links you publish on the platform.",
              basis: "Contract (necessary to provide the service)",
            },
            {
              category: "Usage data",
              data: "Pages visited, interactions with platform features, session duration. Collected via anonymised analytics.",
              basis: "Legitimate interest (improving the service)",
            },
            {
              category: "Technical data",
              data: "IP address, browser type, device type, and request logs. Collected automatically by our infrastructure.",
              basis: "Legitimate interest (security and performance)",
            },
            {
              category: "Communications",
              data: "Messages sent to Archtivy via email or contact forms.",
              basis: "Legitimate interest (responding to enquiries)",
            },
          ].map(({ category, data, basis }) => (
            <div
              key={category}
              className="rounded-[4px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {category}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {data}
              </p>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-600">
                Legal basis: {basis}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection heading="Data sharing">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            We do not sell personal data. We share data only as necessary to
            operate the platform:
          </p>
          <ul className="space-y-2">
            {[
              "Clerk — authentication provider; processes account credentials",
              "Supabase — database infrastructure; stores all platform data",
              "Vercel — hosting and analytics; processes anonymised usage data",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {item}
              </li>
            ))}
          </ul>
          <p>
            We may disclose data to law enforcement or regulators where required
            by applicable law. In all other cases, we do not share personal
            data with third parties.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Data retention">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Account data is retained for as long as your account is active. If
            you delete your account, we will delete or anonymise your personal
            data within 30 days, subject to legal retention obligations.
          </p>
          <p>
            Content you publish (projects, products) may be retained in
            anonymised or aggregated form for analytical purposes after account
            deletion, unless you request full removal.
          </p>
          <p>
            Technical and usage data is retained for up to 12 months for
            security and analytics purposes.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Your rights">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              right: "Access",
              desc: "Request a copy of the personal data we hold about you.",
            },
            {
              right: "Rectification",
              desc: "Request correction of inaccurate or incomplete data.",
            },
            {
              right: "Erasure",
              desc: "Request deletion of your personal data, subject to legal obligations.",
            },
            {
              right: "Restriction",
              desc: "Request that we limit processing of your data in certain circumstances.",
            },
            {
              right: "Portability",
              desc: "Receive your data in a structured, machine-readable format.",
            },
            {
              right: "Objection",
              desc: "Object to processing based on legitimate interests.",
            },
          ].map(({ right, desc }) => (
            <div
              key={right}
              className="space-y-1 rounded-[4px] border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {right}
              </p>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {desc}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          To exercise any of these rights, contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            info@archtivy.com
          </a>
          . We respond to all requests within 30 days.
        </p>
      </MarketingSection>

      <MarketingSection heading="International transfers">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Archtivy is operated from the United States. If you are located in
          the European Economic Area, United Kingdom, or another jurisdiction
          with data transfer restrictions, your data may be transferred to and
          processed in the United States. We rely on standard contractual
          clauses and equivalent mechanisms where required by applicable law.
        </p>
      </MarketingSection>

      <MarketingSection>
        <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
          <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Terms of Use
          </Link>
          <span>·</span>
          <Link href="/cookies" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Cookie Policy
          </Link>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
