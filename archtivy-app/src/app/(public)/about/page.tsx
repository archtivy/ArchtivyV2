import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { AboutCTAs } from "./AboutCTAs";
import {
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "About | Archtivy",
  description:
    "Archtivy is the structured record of global architecture — connecting every project to its products, every credit to its professional, and every specification to its brand.",
};

const INDEXED = [
  {
    title: "Projects",
    body: "Architectural projects submitted with structured fields: type, location, year, team credits, and products specified. Every project is a node in a growing network.",
  },
  {
    title: "Products",
    body: "Architecture product listings with category, type, brand, and specification history. Products accumulate a verifiable record of where and how they are used.",
  },
  {
    title: "Professionals",
    body: "Designer and architect profiles connected to their work. Every credit attributed in a project becomes part of a permanent, queryable professional record.",
  },
  {
    title: "Brands",
    body: "Architecture product brands connected to the projects where their products are specified. Brands gain traceable visibility inside real architectural contexts.",
  },
];

export default async function AboutPage() {
  const { userId } = await auth();
  const profileResult = userId
    ? await getProfileByClerkId(userId)
    : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-16 sm:space-y-20">
      {/* Hero */}
      <header className="space-y-5 pt-4 sm:pt-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
          About
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Architecture has always produced intelligence. It was never
          organised.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Every completed project carries embedded knowledge — the products
          specified, the professionals credited, the decisions made across
          months of design. This information has always existed. What it has
          never had is structure.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <AboutCTAs userId={userId} role={role} />
        </div>
      </header>

      {/* Why Archtivy exists */}
      <MarketingSection heading="Why this exists">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              The architectural industry communicates through media, portfolios,
              and disconnected directories. These formats were built for
              attention, not accuracy. They capture the exceptional, not the
              systemic. They reward editorial selection, not professional record.
            </p>
            <p>
              The result is an industry that produces enormous amounts of
              embedded knowledge and has no systematic way to access it. A
              product brand cannot reliably know which firms specify their
              products. A designer cannot demonstrate their specification
              history without manually compiling a portfolio. A researcher
              cannot query architectural production by material or region
              without pulling from dozens of incompatible sources.
            </p>
          </div>
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Archtivy was built on a different logic. We are the infrastructure
              layer beneath global architecture — connecting every project to
              the products within it, every credit to the professional who
              earned it, every specification to the brand that made it possible.
            </p>
            <p>
              We do not curate. We do not select what deserves attention. We
              provide infrastructure for the industry to record itself —
              accurately, permanently, and at scale.
            </p>
          </div>
        </div>
      </MarketingSection>

      {/* What gets indexed */}
      <MarketingSection heading="What gets indexed">
        <div className="grid gap-6 sm:grid-cols-2">
          {INDEXED.map(({ title, body }) => (
            <div
              key={title}
              className="space-y-3 rounded-[4px] border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
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

      {/* The intelligence layer */}
      <MarketingSection heading="The intelligence layer">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              When projects are submitted with structured credits — team
              members, products used, project type, location, year — the data
              becomes queryable. Patterns emerge. Specification trends become
              visible. Professional networks become legible. Brand performance
              inside architectural practice becomes measurable.
            </p>
            <p>
              This is the intelligence layer. It does not require a radical
              reinvention of how architecture is practised. It requires a
              platform designed from the ground up to capture the intelligence
              that already exists in every completed project.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Product-to-project traceability at global scale",
              "Verifiable professional credit history",
              "Specification trend data by region, typology, and material",
              "Brand specification footprint across markets",
              "Permanent, queryable record independent of media cycles",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 rounded-[4px] border border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#002abf]" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      {/* Roadmap */}
      <MarketingSection heading="What we are building toward">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              phase: "Now",
              items: [
                "Structured project and product submissions",
                "Team credit attribution",
                "Product-to-project linking",
                "Professional profiles",
                "Global explore and search",
              ],
            },
            {
              phase: "Next",
              items: [
                "Brand specification analytics dashboard",
                "API access for qualified partners",
                "Institutional and school partnerships",
                "Enhanced professional intelligence view",
                "Specification trend reports",
              ],
            },
            {
              phase: "Long term",
              items: [
                "BIM and CMS integration layer",
                "Global specification database",
                "Research and academic data access",
                "Multi-language support",
                "Canonical architectural record",
              ],
            },
          ].map(({ phase, items }) => (
            <div key={phase} className="space-y-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                {phase}
              </h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                  >
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Architecture deserves better infrastructure."
        body="Submit your work. Every project, product, and credit makes the record more complete and more useful to the entire industry."
        primaryLabel="Submit Your Work"
        primaryHref="/add/project"
        secondaryLabel="Explore the Platform"
        secondaryHref="/explore/projects"
      />
    </article>
  );
}
