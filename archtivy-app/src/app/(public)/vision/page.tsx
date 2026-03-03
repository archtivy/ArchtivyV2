import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Vision | Archtivy",
  description:
    "Why architecture data is fragmented and why structured intelligence changes the industry.",
};

export default function VisionPage() {
  return (
    <MarketingPage
      label="Vision"
      headline="Architecture data is fragmented. That fragmentation has a cost."
      subheadline="Every completed project carries embedded knowledge — the products specified, the teams credited, the decisions made. This information has always existed. What it has never had is structure."
    >
      {/* Fragmentation problem */}
      <MarketingSection heading="The fragmentation problem">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              The current information infrastructure of architecture was built
              for media reach, not structural accuracy. It rewards editorial
              attention over completeness. It captures the award-winning and the
              photographed, not the systemic record of how the built environment
              is actually produced.
            </p>
            <p>
              A product brand cannot reliably know which architecture firms
              specify their products, in which countries, across which project
              types. A designer cannot demonstrate their specification history
              without manually assembling a portfolio. A researcher cannot query
              architectural production by material, region, or typology without
              pulling from dozens of incompatible sources.
            </p>
            <p>
              This is not a minor inconvenience. It is a structural failure in
              how an industry worth trillions in annual output manages its own
              knowledge.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              {
                n: "01",
                text: "Project credits are scattered across PDFs, press releases, and disconnected firm websites with no canonical record.",
              },
              {
                n: "02",
                text: "Product specification data lives inside manufacturer sales systems, inaccessible to market intelligence.",
              },
              {
                n: "03",
                text: "Professional histories are rebuilt from scratch for every award submission, tender document, and client pitch.",
              },
              {
                n: "04",
                text: "There is no shared database connecting the products used in a building to the professionals who specified them.",
              },
            ].map(({ n, text }) => (
              <li
                key={n}
                className="flex gap-5 rounded-[4px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="shrink-0 font-mono text-xs text-zinc-300 dark:text-zinc-700">
                  {n}
                </span>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {text}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      {/* Structured credits */}
      <MarketingSection heading="What structured credits enable">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Verifiable professional history",
              body: "When credits are attributed at the project level — by role, firm, and contribution — a professional accumulates a verifiable record that persists independent of any publication cycle or platform.",
            },
            {
              title: "Product-to-project traceability",
              body: "Each product tagged in a project creates a permanent link between the specification context and the brand. Over time, a product accumulates a traceable record of where it has been specified and by whom.",
            },
            {
              title: "Market intelligence from real data",
              body: "Aggregate specification records reveal patterns that were previously invisible: which markets favour which products, which typologies drive specification volume, which firms lead in specific material categories.",
            },
            {
              title: "Discoverable work that compounds",
              body: "A project with structured credits is findable by product, by material, by location, by typology. Every new connection makes the record more complete and more useful.",
            },
            {
              title: "Cross-industry network effects",
              body: "Each new designer project that tags a product increases the value of that product's intelligence record. Each new brand increases the prestige of being specified. The value compounds with scale.",
            },
            {
              title: "Long-term professional permanence",
              body: "A firm's website changes. Media features become inaccessible. Archtivy is built to persist — your professional record does not depend on any external publication cycle.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Infrastructure layer */}
      <MarketingSection heading="The infrastructure layer">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Archtivy's role is not editorial. We do not curate what is
              important or select which projects deserve attention. We provide
              infrastructure for the industry to record itself — accurately,
              permanently, and at scale.
            </p>
            <p>
              A platform that achieves canonical status for architectural
              specification becomes the primary reference for professional
              credibility, product intelligence, and research globally. That
              infrastructure does not yet exist. Archtivy is building it.
            </p>
          </div>
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              We are building toward a future in which every built project has a
              permanent, verifiable record. In which a designer's professional
              history is as structured as a financial record. In which a brand
              can query its specification footprint across 90 countries. In
              which architectural intelligence is no longer fragmented by
              default.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Be part of the record."
        body="Submit your projects and products. Every entry contributes to a more complete picture of global architectural production."
        primaryLabel="Submit Your Work"
        primaryHref="/add/project"
        secondaryLabel="Explore Products"
        secondaryHref="/explore/products"
      />
    </MarketingPage>
  );
}
