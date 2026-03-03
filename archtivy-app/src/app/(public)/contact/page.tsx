import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata = {
  title: "Contact | Archtivy",
  description:
    "Contact Archtivy for partnerships, press inquiries, support, or general questions.",
};

const DIRECT_LINES = [
  {
    category: "Partnerships",
    description:
      "Brand intelligence partnerships, institutional access, technology integrations, and co-development discussions.",
    email: "partnerships@archtivy.com",
  },
  {
    category: "Press",
    description:
      "Editorial coverage, interviews, data requests, and media asset access.",
    email: "press@archtivy.com",
  },
  {
    category: "Support",
    description:
      "Account issues, platform questions, submission problems, and profile claims.",
    email: "support@archtivy.com",
  },
];

export default function ContactPage() {
  return (
    <MarketingPage
      label="Contact"
      headline="Direct lines. No requests that disappear."
      subheadline="We review every message and respond within two business days. Use the category that best describes your inquiry."
    >
      {/* Direct lines */}
      <MarketingSection heading="Direct contact">
        <div className="grid gap-4 sm:grid-cols-3">
          {DIRECT_LINES.map(({ category, description, email }) => (
            <div
              key={category}
              className="space-y-3 rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                {category}
              </h3>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
              <a
                href={`mailto:${email}`}
                className="block text-sm font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
              >
                {email}
              </a>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Form */}
      <MarketingSection heading="Send a message">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Use this form for any inquiry. Select the category that most
              closely matches your message — it helps us route correctly and
              respond faster.
            </p>
            <p>
              For technical issues or account-specific problems, include as much
              detail as possible: your username, the page or feature involved,
              and a description of what happened.
            </p>
          </div>
          <ContactForm />
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
