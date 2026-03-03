import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Press | Archtivy",
  description:
    "Press resources, key facts, and media contact for Archtivy — the global architecture intelligence platform.",
};

const KEY_FACTS = [
  {
    label: "Founded",
    value: "2024",
  },
  {
    label: "Headquarters",
    value: "Los Angeles, CA",
  },
  {
    label: "Category",
    value: "Architecture intelligence / PropTech",
  },
  {
    label: "Platform type",
    value: "Structured professional record and product traceability",
  },
  {
    label: "Users",
    value: "Architects, interior designers, product brands",
  },
  {
    label: "Geographic reach",
    value: "Global",
  },
];

export default function PressPage() {
  return (
    <MarketingPage
      label="Press"
      headline="Archtivy in the record."
      subheadline="Archtivy is a global architecture intelligence platform connecting projects, products, and professionals through structured credits and permanent visibility."
    >
      {/* Boilerplate */}
      <MarketingSection heading="About Archtivy">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Archtivy is building the structured record of global architecture
              — an intelligence infrastructure that connects every project to
              the products within it, every credit to the professional who
              earned it, and every specification to the brand that made it
              possible.
            </p>
            <p>
              Architecture firms and independent designers use Archtivy to
              establish structured professional records. Product brands use it
              to understand where, how, and by whom their products are specified
              globally. The platform is built on the premise that the full
              record of architecture holds intelligence the industry has never
              been able to access — until now.
            </p>
            <p>
              Archtivy is not a portfolio platform, a directory, or a media
              outlet. It is infrastructure for the architectural industry —
              designed to persist, compound, and become the canonical reference
              for professional credibility and product intelligence worldwide.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 rounded-[4px] border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {KEY_FACTS.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-start justify-between gap-6 px-5 py-3.5"
              >
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {label}
                </span>
                <span className="text-right text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </MarketingSection>

      {/* Press contact */}
      <MarketingSection heading="Press contact">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
              Media inquiries
            </h3>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Editorial contact, interviews, data requests, and coverage
              coordination.
            </p>
            <a
              href="mailto:press@archtivy.com"
              className="mt-4 block text-sm font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              press@archtivy.com
            </a>
          </div>

          <div className="rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
              Press kit
            </h3>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Brand assets, logos, product screenshots, and founder
              information.
            </p>
            <a
              href="/press-kit"
              className="mt-4 block text-sm font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              Download press kit →
            </a>
          </div>

          <div className="rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
              General contact
            </h3>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Partnership discussions, platform questions, and general
              inquiries.
            </p>
            <a
              href="mailto:hello@archtivy.com"
              className="mt-4 block text-sm font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              hello@archtivy.com
            </a>
          </div>
        </div>
      </MarketingSection>

      {/* Coverage note */}
      <MarketingSection heading="Coverage">
        <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Coverage and feature articles will be listed here as they are
          published. For publication or broadcast enquiries, contact the press
          team directly.
        </p>
      </MarketingSection>

      <MarketingCTA
        heading="Explore the platform."
        body="See the structured record of architectural projects, products, and professionals in its current state."
        primaryLabel="Explore Projects"
        primaryHref="/explore/projects"
        secondaryLabel="Explore Products"
        secondaryHref="/explore/products"
      />
    </MarketingPage>
  );
}
