import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Connections and Accuracy | Archtivy",
  description:
    "How Archtivy establishes the connections between architecture projects, design studios, products and brands — what counts as a credit, what counts as a suggestion, and why gaps are left visible.",
};

/**
 * Connections and accuracy.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * "Structured data turns into intelligence at scale", promising "specification
 * frequency by product, region, and typology", "professional network mapping
 * and collaboration history" and "brand footprint analysis across markets and
 * firm types". None of it exists, and none of it could be produced honestly
 * from the data on the platform today. It was an analytics product described
 * in advance of itself.
 *
 * The page keeps its route and takes the one subject in this territory that is
 * both true and worth a page: how a connection gets established, what we will
 * and will not infer, and why an empty section is preferable to a filled-in
 * guess. That is the argument the rest of the platform depends on, and it does
 * not overlap /how-it-works, which describes the reader's path.
 */
export default function ConnectionsPage() {
  return (
    <MarketingPage
      label="Connections"
      headline="A connection is either established or it is absent."
      subheadline="Archtivy is only as useful as its connections are trustworthy. So it matters a great deal where each one comes from, and it matters that the difference is visible."
    >
      <MarketingSection heading="Where connections come from">
        <ul className="divide-y divide-hairline border-y border-hairline">
          {[
            [
              "Stated by the people who made the work",
              "A studio publishes a project and credits the collaborators and the products in it. A brand publishes a product with its category and materials. These are the strongest connections on the platform, because someone with first-hand knowledge asserted them.",
            ],
            [
              "Derived from shared attributes",
              "A material, a category, a city. If two projects both specify the same stone, that relationship follows from the records themselves and needs no interpretation.",
            ],
            [
              "Suggested by resemblance",
              "In a project photograph, we can surface products that look like what is in the room. This is a suggestion about appearance and nothing more. It is never labelled as a specification, and it never appears where a credited product would.",
            ],
          ].map(([title, body]) => (
            <li key={title} className="grid gap-2 py-6 sm:grid-cols-[16rem_1fr] sm:gap-8">
              <h3 className="font-body text-[15px] text-ink">{title}</h3>
              <p className="max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection heading="What we will not do">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              We do not infer a specification. If a chair in a photograph
              closely resembles a product in the catalogue, that is not
              evidence the chair is that product, and presenting it as one
              would corrupt every genuine credit around it.
            </p>
            <p>
              We do not fill empty fields with plausible values. A project with
              no credited products shows no credited products.
            </p>
          </div>
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              We do not publish counts or coverage figures we cannot stand
              behind. Where the network is thin, the interface shows less
              rather than implying more.
            </p>
            <p>
              None of this is caution for its own sake. A discovery platform
              whose connections cannot be trusted is a worse tool than the
              scattered pages it set out to replace.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection heading="Why gaps stay visible">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            Most projects on the internet credit their photographer and not
            their furniture. That is the inheritance Archtivy is working
            against, and it means many projects here have connections that are
            incomplete.
          </p>
          <p>
            Leaving those gaps legible is deliberate. It shows a reader what is
            known and what is not, and it shows a studio or a brand exactly
            where their own work would make the network more useful.
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Credit what is in your work."
        body="The connections that make discovery useful come from the people who made the projects."
        primaryLabel="Add a project"
        primaryHref="/add/project"
        secondaryLabel="How it works"
        secondaryHref="/how-it-works"
      />
    </MarketingPage>
  );
}
