import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Partners | Archtivy",
  description:
    "Archtivy works with design brands, architecture studios, schools and publications to make the connections between projects, products and the people who specify them more complete.",
};

/**
 * Partners.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * "Build on the architecture intelligence record." — a partnerships pitch for
 * a data platform, with the value described as adding to "the record". The
 * page also implied an established programme with tiers.
 *
 * Rewritten as what it honestly is: an early platform inviting a small number
 * of specific collaborations. No programme language, no tiers, no promises
 * about reach.
 */
export default function PartnersPage() {
  return (
    <MarketingPage
      label="Partners"
      headline="The network is only as good as its connections."
      subheadline="Archtivy connects projects to the studios that designed them and the products inside them. Those connections come from the people who make the work — which is why we would rather build this with them than around them."
    >
      <MarketingSection heading="Who we work with">
        <ul className="divide-y divide-hairline border-y border-hairline">
          {[
            [
              "Design brands",
              "Manufacturers of furniture, lighting, surfaces and building products who want their work found inside the spaces it was specified into rather than only in a catalogue.",
            ],
            [
              "Architecture and interior studios",
              "Practices willing to credit what is in their projects — the products, the collaborators, the materials. This is the connective work nobody else can do.",
            ],
            [
              "Schools and research groups",
              "Departments studying how buildings are actually specified, and how material and product decisions travel between practices.",
            ],
            [
              "Publications and platforms",
              "Editorial teams already documenting architecture, where linking to a fuller context serves the reader.",
            ],
          ].map(([title, body]) => (
            <li key={title} className="grid gap-2 py-6 sm:grid-cols-[15rem_1fr] sm:gap-8">
              <h3 className="font-body text-[15px] text-ink">{title}</h3>
              <p className="max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection heading="What a collaboration looks like">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            There is no programme with tiers, and nothing to buy. In practice a
            partnership means getting a body of work onto Archtivy properly —
            products with real specifications, projects with real credits — and
            telling us where the model breaks down for you.
          </p>
          <p>
            Archtivy is early. The most useful thing a partner does at this
            stage is expose the gaps: a category we handle badly, a
            relationship we cannot yet express, a workflow that makes
            crediting products harder than it should be.
          </p>
        </div>
      </MarketingSection>

      <MarketingSection heading="Getting in touch">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            Write to us with who you are, the work you would want on the
            platform, and what you are hoping it does. We read everything and
            reply.
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Tell us what you are working on."
        body="We would rather hear the specific problem than a general enquiry."
        primaryLabel="Contact us"
        primaryHref="/contact"
        secondaryLabel="Explore projects"
        secondaryHref="/projects"
      />
    </MarketingPage>
  );
}
