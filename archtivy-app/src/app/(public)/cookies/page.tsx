import Link from "next/link";
import { MarketingPage, MarketingSection } from "@/components/marketing/MarketingPage";

const LAST_UPDATED = "2026-03-01";

export const metadata = {
  title: "Cookie Policy | Archtivy",
  description: "How Archtivy uses cookies and similar tracking technologies.",
};

export default function CookiesPage() {
  return (
    <MarketingPage
      label="Legal"
      headline="Cookie policy."
      subheadline={`Last updated: ${LAST_UPDATED}. This document may be updated as the platform and applicable regulations evolve.`}
    >
      <MarketingSection heading="Overview">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Archtivy uses cookies and similar technologies to operate the
            platform, maintain your session, understand how the service is used,
            and improve functionality. This policy explains what cookies we use
            and why.
          </p>
          <p>
            By using Archtivy, you consent to our use of cookies as described
            in this policy. You can withdraw consent or adjust your preferences
            at any time using the instructions below.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="What are cookies">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Cookies are small text files stored on your device when you visit a
          website. They allow the website to recognise your device on subsequent
          visits and remember certain information, such as your authentication
          state, preferences, or session data.
        </p>
      </MarketingSection>

      <MarketingSection heading="Cookies we use">
        <div className="space-y-6">
          {[
            {
              type: "Essential cookies",
              purpose:
                "Required for the platform to function. These include session tokens, CSRF protection cookies, and authentication state managed by our identity provider (Clerk). These cannot be disabled without breaking the platform.",
              retention: "Session or up to 30 days",
            },
            {
              type: "Analytics cookies",
              purpose:
                "We use Vercel Analytics to understand aggregate usage patterns — page views, navigation paths, and performance data. This data is anonymised and does not identify individual users.",
              retention: "Up to 12 months",
            },
            {
              type: "Preference cookies",
              purpose:
                "We store your theme preference (light or dark mode) in localStorage rather than a server-side cookie. This is stored on your device only and is not transmitted to our servers.",
              retention: "Persistent until cleared",
            },
          ].map(({ type, purpose, retention }) => (
            <div
              key={type}
              className="rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {type}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {purpose}
              </p>
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
                Retention: {retention}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection heading="Managing your preferences">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Most browsers allow you to control cookies through their settings.
            You can typically block or delete cookies by accessing your
            browser&apos;s privacy or security settings. Blocking essential
            cookies will prevent certain platform features from working
            correctly, including login and session persistence.
          </p>
          <p>
            To opt out of Vercel Analytics, you can use a browser-level
            analytics blocker or disable JavaScript for analytics scripts. Note
            that this does not affect the core functionality of the platform.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Third-party services">
        <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          <p>
            Archtivy uses the following third-party services that may set their
            own cookies or use similar technologies:
          </p>
          <ul className="space-y-2">
            {[
              "Clerk — authentication and session management",
              "Vercel — hosting and anonymised analytics",
              "Supabase — data storage (no client-side cookies)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                {item}
              </li>
            ))}
          </ul>
          <p>
            Each of these providers has its own privacy and cookie policies.
            We recommend reviewing them directly.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Changes to this policy">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          We may update this cookie policy as the platform evolves or as
          applicable regulations change. The date at the top of this page
          indicates when it was last revised. Continued use of the platform
          constitutes acceptance of the current policy.
        </p>
      </MarketingSection>

      <MarketingSection heading="Contact">
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Questions about this policy can be sent to{" "}
          <a
            href="mailto:privacy@archtivy.com"
            className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            privacy@archtivy.com
          </a>
          .
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
          <Link href="/data-processing" className="hover:text-zinc-700 dark:hover:text-zinc-200">
            Data Processing
          </Link>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
