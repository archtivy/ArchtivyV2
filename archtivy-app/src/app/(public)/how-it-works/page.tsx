import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import {
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "How It Works | Archtivy",
  description:
    "How Archtivy structures projects, products, and credits into a permanent intelligence record.",
};

const STEPS = [
  {
    n: "01",
    title: "Create a profile",
    body: "Professionals create a verified profile connected to their firm type, role, and location. The profile becomes the anchor point for all future credits and project associations.",
  },
  {
    n: "02",
    title: "Submit a project",
    body: "Add a project with structured fields: type, location, year, category, and a description. Upload images and set the full context for the work.",
  },
  {
    n: "03",
    title: "Attribute structured credits",
    body: "Credit every team member by role — lead designer, collaborating firm, structural engineer, landscape architect, lighting designer, and others. Credits are permanent and connected to each professional's profile.",
  },
  {
    n: "04",
    title: "Tag the products",
    body: "Link the architecture products used in the project by category and brand. Each tag creates a permanent connection between the specification context and the brand's product record.",
  },
  {
    n: "05",
    title: "Join the network",
    body: "The project becomes part of the global record. It is discoverable by product, location, typology, material, and professional. Every connection makes the record more complete.",
  },
];

export default async function HowItWorksPage() {
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
          How It Works
        </p>
        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Five layers. One permanent record.
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Archtivy is not a publishing platform. It is a structured intelligence
          system. Understanding it means understanding its five interconnected
          layers — from profile creation to global discoverability.
        </p>
      </header>

      {/* Step-by-step */}
      <MarketingSection>
        <div className="space-y-4">
          {STEPS.map(({ n, title, body }) => (
            <div
              key={n}
              className="grid grid-cols-[48px_1fr] gap-6 rounded-[4px] border border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[64px_1fr]"
            >
              <span className="font-mono text-xs font-semibold text-zinc-300 dark:text-zinc-700">
                {n}
              </span>
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {title}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* For professionals */}
      <MarketingSection heading="For professionals">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              For designers and architecture firms, Archtivy is a structured
              visibility layer beneath professional practice. Not social media
              reach. Not portfolio hosting. A permanent, structured record of
              your professional output that connects your work to the products
              within it and to the industry that relies on it.
            </p>
            <p>
              Each project you submit with complete credits accumulates
              authority in the network. Brands discover your specification
              patterns. Researchers can query your professional history by
              project type, location, or material category. Your record persists
              independent of any publication cycle.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Credits are attributed by role, not just by name",
              "Your profile aggregates all projects you have contributed to",
              "Products you specify connect your work to brands",
              "Your record is permanent and queryable",
              "Discoverability compounds with every project added",
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

      {/* For brands */}
      <MarketingSection heading="For brands">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              For architecture product brands, Archtivy provides traceable
              visibility inside real architectural contexts. When a designer
              submits a project and tags your product, a permanent record is
              created — connecting your product to the firm, the project type,
              the location, and the year.
            </p>
            <p>
              Over time, your product accumulates a structured specification
              record. This record is the basis for brand intelligence: which
              firms specify your products most consistently, which markets, and
              which typologies. The intelligence compounds with every new
              project that references your products.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Products appear in context, not as promoted placements",
              "Specification records are permanent and traceable",
              "Brand intelligence dashboard in development",
              "Claim your products to manage your brand record",
              "Visibility compounds with network scale",
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

      <MarketingCTA
        heading="Start your record."
        body="Submit your first project or claim your brand profile."
        primaryLabel="Submit Your Work"
        primaryHref="/add/project"
        secondaryLabel="Explore the Platform"
        secondaryHref="/explore/projects"
      />
    </article>
  );
}
