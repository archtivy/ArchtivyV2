import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Data & Intelligence | Archtivy",
  description:
    "How Archtivy structures architectural data into actionable intelligence for professionals and brands.",
};

export default function DataIntelligencePage() {
  return (
    <MarketingPage
      label="Data & Intelligence"
      headline="Structured data turns into intelligence at scale."
      subheadline="Every project submitted to Archtivy generates structured data. Every product tag, every team credit, every location attribute compounds into a queryable record of global architectural production."
    >
      {/* What gets structured */}
      <MarketingSection heading="What gets structured">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Projects",
              items: [
                "Type and typology",
                "Location and year",
                "Team credits by role",
                "Products specified",
                "Materials used",
              ],
            },
            {
              title: "Products",
              items: [
                "Category and type",
                "Brand and manufacturer",
                "Specification frequency",
                "Project contexts",
                "Specifying regions",
              ],
            },
            {
              title: "Professionals",
              items: [
                "Firm type and role",
                "Project history",
                "Specification patterns",
                "Geographic range",
                "Collaboration network",
              ],
            },
            {
              title: "Brands",
              items: [
                "Product portfolio",
                "Specification footprint",
                "Regional performance",
                "Specifying firms",
                "Typology distribution",
              ],
            },
          ].map(({ title, items }) => (
            <div
              key={title}
              className="space-y-4 rounded-[4px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Intelligence outputs */}
      <MarketingSection heading="Intelligence outputs">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              The structured data within Archtivy becomes actionable at two
              levels: individual and aggregate. At the individual level, a
              professional can view their full specification history, a brand
              can track where their products appear, and a project page surfaces
              its complete credit record.
            </p>
            <p>
              At the aggregate level, patterns emerge that were previously
              invisible. Specification trends by region, product adoption by
              typology, professional network mapping — these are the outputs
              of a structured intelligence system operating at scale.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Specification frequency by product, region, and typology",
              "Professional network mapping and collaboration history",
              "Brand footprint analysis across markets and firm types",
              "Emerging specification trends by category",
              "Cross-referencing of materials, products, and project contexts",
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

      {/* Coming soon */}
      <MarketingSection heading="Intelligence features">
        <div className="rounded-[4px] border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Advanced intelligence features are in development.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Query dashboards, trend reports, and professional network
            visualisation are planned for a future release. The data is being
            collected now. The intelligence layer follows at scale.
          </p>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            For early access or research partnerships, contact{" "}
            <a
              href="mailto:intelligence@archtivy.com"
              className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              intelligence@archtivy.com
            </a>
            .
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Add to the record."
        body="Every project submitted improves the intelligence available to everyone on the platform."
        primaryLabel="Submit a Project"
        primaryHref="/add/project"
        secondaryLabel="Explore the Platform"
        secondaryHref="/explore/projects"
      />
    </MarketingPage>
  );
}
