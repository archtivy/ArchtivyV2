import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Brand Intelligence | Archtivy",
  description:
    "Specification analytics and product intelligence for architecture product brands on Archtivy.",
};

export default function BrandIntelligencePage() {
  return (
    <MarketingPage
      label="Brand Intelligence"
      headline="Know where your products are specified. Understand why."
      subheadline="Architecture product brands invest significantly in specification. The return on that investment has historically been opaque. Archtivy creates the first structured record of architectural specification — and makes it queryable."
    >
      {/* The opportunity */}
      <MarketingSection heading="The specification gap">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Every year, architecture product brands invest in specification
              support — technical documentation, CPD presentations, showrooms,
              and relationships with designers built over years. The return on
              that investment has historically been difficult to measure and
              nearly impossible to optimise.
            </p>
            <p>
              Which markets are driving your specification volume? Which
              typologies favour your products? Which firms are specifying your
              direct competitors? These questions have always been answerable in
              theory. Archtivy makes them answerable in practice.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Which architecture firms specify your products most consistently",
              "Geographic distribution of your specification footprint",
              "Project typologies where your products perform best",
              "Emerging specifiers before they become large clients",
              "Competitive specification patterns within your category",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 rounded-[4px] border border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#002abf]" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </MarketingSection>

      {/* Product traceability */}
      <MarketingSection heading="Product-to-project traceability">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Tag at submission",
              body: "When a designer submits a project to Archtivy, they tag the products used. Each tag is a verifiable data point connecting your product to a real architectural context.",
            },
            {
              step: "02",
              title: "Build a specification record",
              body: "Over time, your product accumulates a traceable record: which firms, which countries, which typologies, which years. The record grows with every new project that references your product.",
            },
            {
              step: "03",
              title: "Query the intelligence",
              body: "The brand intelligence dashboard surfaces the patterns within that record — making visible what was previously scattered across sales systems and anecdotal reports.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="space-y-3">
              <span className="font-mono text-xs text-zinc-300 dark:text-zinc-700">
                {step}
              </span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Why not advertising */}
      <MarketingSection heading="Why this is not advertising">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Advertising decays when spend stops. Brand intelligence on
              Archtivy compounds with every new project that references your
              products. The platform is designed to reward genuine architectural
              relevance — a product with 300 specifications is more
              discoverable than one with 30, not because it paid more, but
              because it earned more placements.
            </p>
            <p>
              When a designer or researcher explores a project on Archtivy,
              your product appears in its real architectural context — not as
              a promoted placement, but as a credited specification. This is
              the most credible form of brand exposure available to an
              architecture product company.
            </p>
          </div>
          <div className="divide-y divide-zinc-100 rounded-[4px] border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {[
              ["Advertising", "Paid placement, decays on budget pause"],
              ["Directory listing", "Static presence, no specification context"],
              ["Trade fair", "Expensive, time-limited, reach is local"],
              [
                "Archtivy",
                "Permanent record, specification context, compounds with scale",
              ],
            ].map(([type, desc]) => (
              <div key={type} className="flex gap-6 px-5 py-4">
                <span className="w-28 shrink-0 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {type}
                </span>
                <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </MarketingSection>

      {/* Coming soon */}
      <MarketingSection heading="Brand intelligence dashboard">
        <div className="rounded-[4px] border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            The brand intelligence dashboard is in development.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            The specification data is being collected now. The dashboard —
            providing queryable access to your brand&apos;s specification footprint
            — is planned for release to brand partners. Contact us to be
            considered for early access.
          </p>
          <a
            href="mailto:brands@archtivy.com"
            className="mt-4 inline-block text-sm font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            brands@archtivy.com
          </a>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Start building your specification record."
        body="Claim your brand profile and ensure your products are correctly attributed in architectural projects."
        primaryLabel="Claim Your Brand"
        primaryHref="/claim"
        secondaryLabel="Explore Products"
        secondaryHref="/explore/products"
      />
    </MarketingPage>
  );
}
