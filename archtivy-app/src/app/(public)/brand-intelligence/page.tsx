import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "For Design Brands — Show Where Your Products Live | Archtivy",
  description:
    "A catalogue shows a product against a white background. Archtivy shows furniture, lighting and building products inside the architecture projects they were specified into, alongside the studios that chose them.",
};

/**
 * For design brands.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * A specification-analytics pitch: "Know where your products are specified.
 * Understand why", promising to reveal "which architecture firms specify your
 * products most consistently", "geographic distribution of your specification
 * footprint", "project typologies where your products perform best" and
 * "emerging specifiers before they become large clients", under the heading
 * "Brand intelligence dashboard".
 *
 * None of that exists. There is no analytics dashboard, no specification
 * footprint report and no firm-level breakdown, and with the current density
 * of the graph there could not honestly be one. The page was selling a market
 * intelligence product to procurement.
 *
 * What Archtivy actually offers a brand is context: a product shown inside the
 * spaces it was specified into, reachable from the studios that chose it. That
 * is worth stating plainly and is true today. The page now says that.
 *
 * ── ON THE URL ──────────────────────────────────────────────────────────────
 * The route stays /brand-intelligence. Renaming it would mean adding a page
 * and a redirect, and the brief is explicit about not creating pages that do
 * not already exist. The footer label now reads "For brands", which is what a
 * reader is choosing.
 */
export default function ForBrandsPage() {
  return (
    <MarketingPage
      label="For brands"
      headline="Show where your products live."
      subheadline="A product photographed against a white wall tells a specifier almost nothing. The same product in a room — at that scale, beside those materials, chosen by a studio whose judgement they trust — tells them everything."
    >
      <MarketingSection heading="The catalogue problem">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="max-w-[58ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              Product catalogues are organised the way products are
              manufactured: by family, by finish, by dimension. Specifiers do
              not think that way. They are looking at a room and asking what
              would work in it.
            </p>
            <p>
              So the most persuasive evidence a brand has — the projects its
              work is already in — is the evidence hardest to find. It sits in
              a case-study PDF, or in an architecture feature that credits the
              photographer and not the furniture.
            </p>
          </div>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {[
              "A product page shows the object, never the space.",
              "The projects it appears in live on other sites, uncredited.",
              "A specifier searching by room type finds nothing.",
              "The studios who already chose it are invisible to the next one.",
            ].map((t) => (
              <li key={t} className="py-5 font-body text-[15px] leading-[24px] text-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      <MarketingSection heading="Products in context">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            On Archtivy a product is connected to the projects it has been
            specified into, where a studio has credited it. Each of those leads
            back to the space, the practice and the rest of their work.
          </p>
          <p>
            It runs the other way too. Someone reading a project can reach your
            product from the room it is in, and your brand from the product.
            That is a route into your catalogue that does not begin with your
            name.
          </p>
        </div>

        <ul className="mt-10 divide-y divide-hairline border-y border-hairline">
          {[
            [
              "A brand profile",
              "Your products, your location, and the projects your work appears in — reachable from every product you publish.",
            ],
            [
              "Products inside spaces",
              "Where a studio has credited a product, the project appears with it. The credit comes from the people who did the work, not from us.",
            ],
            [
              "Discovery by what a specifier is thinking",
              "Category, sub-type, material and the kind of space — not only product names.",
            ],
            [
              "Visual discovery",
              "In a project photograph, readers can explore pieces that suit the space. This is similarity, not identification: it surfaces your work to someone looking for that direction.",
            ],
            [
              "Enquiries",
              "A reader who wants to specify something can request information about it, and it reaches you.",
            ],
          ].map(([title, body]) => (
            <li key={title} className="grid gap-2 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
              <h3 className="font-body text-[15px] text-ink">{title}</h3>
              <p className="max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection heading="What this is not">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              It is not advertising. Placement is not bought, and a product
              does not appear in a project because a brand paid for it to.
              Products appear where studios have credited them.
            </p>
            <p>
              It is not a specification analytics service. There is no
              dashboard reporting which practices favour your work or where
              your footprint is growing. We would rather not offer that than
              offer a version built on too little data.
            </p>
          </div>
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              It is not a marketplace. Nothing is sold here and no transaction
              passes through us. A specifier who finds your product is sent to
              you.
            </p>
            <p>
              What it is: the place your products are found in the context that
              makes them make sense.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection heading="Getting started">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            Publish your products with their category, materials and
            dimensions, and add the documentation a specifier needs. As studios
            credit them in their projects, each product accumulates the spaces
            it appears in.
          </p>
          <p>
            If your brand already appears on Archtivy because a studio credited
            your work, you can claim the profile and take it from there.
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Show where your products live."
        body="Publish your products, or see how they are already appearing inside projects."
        primaryLabel="Add a product"
        primaryHref="/add/product"
        secondaryLabel="Browse products"
        secondaryHref="/products"
      />
    </MarketingPage>
  );
}
