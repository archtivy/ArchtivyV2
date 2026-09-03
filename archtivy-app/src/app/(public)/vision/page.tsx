import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Why Archtivy — Connected Discovery for Architecture and Design",
  description:
    "Architecture online is fragmented: projects on one site, products in catalogues, designers in portfolios, brands elsewhere. Archtivy connects projects, designers, products and brands so discovery can follow the relationships that made the work.",
};

/**
 * Why Archtivy — the positioning page.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * The previous version argued that architecture is an industry with a data
 * problem, and that Archtivy is the infrastructure that fixes it: "structured
 * credits", "market intelligence from real data", "a brand can query its
 * specification footprint across 90 countries", "an industry worth trillions
 * in annual output". That is a data-platform pitch, aimed at procurement, and
 * it described a product that does not exist — the numbers were aspirational
 * and the tone was closer to a market-research vendor than to architecture.
 *
 * The page now argues the thing that is actually true and actually built:
 * architecture is made through relationships, those relationships are
 * scattered across the web, and Archtivy puts them back together so a reader
 * can follow one.
 */
export default function VisionPage() {
  return (
    <MarketingPage
      label="Why Archtivy"
      headline="Architecture, finally connected."
      subheadline="A building is the product of relationships — between the people who designed it, the products specified inside it, and the brands that made them. Online, those relationships come apart. Archtivy puts them back together."
    >
      {/* The problem, stated plainly rather than as a market thesis. */}
      <MarketingSection heading="Everything is somewhere. Nothing is together.">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-start">
          <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              Look for a building you admire and you will find the photographs
              on an architecture site. The studio behind it keeps a portfolio
              somewhere else. The chair in the third image sits in a
              manufacturer&apos;s catalogue, under a name the article never
              mentioned. The brand that makes it has its own website, arranged
              by product family rather than by the rooms its work ends up in.
            </p>
            <p>
              Every one of those pages is well made. None of them knows about
              the others. So the reader does the joining by hand — a search, a
              reverse image lookup, a guess — and most of the time gives up
              before the answer arrives.
            </p>
            <p>
              This is not a shortage of information. Architecture is documented
              more thoroughly than almost any other discipline. What is missing
              is the connective tissue: a way to move from the thing you are
              looking at to the things that made it.
            </p>
          </div>

          {/* Restrained: four plain statements, hairline-separated. No cards,
              no icons — the sentences are the content. */}
          <ul className="divide-y divide-hairline border-y border-hairline">
            {[
              "A project names its photographer but rarely its furniture.",
              "A product page shows a studio backdrop, never the room it was specified into.",
              "A studio's portfolio ends at its own work, with no route onward.",
              "Inspiration collects on social platforms, stripped of every credit.",
            ].map((text) => (
              <li key={text} className="py-5 font-body text-[15px] leading-[24px] text-muted">
                {text}
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      {/* The graph, which is the actual product. */}
      <MarketingSection heading="In the real world, these things belong together.">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            A project has a designer. A space contains products. Products come
            from brands. Materials shape projects. The same lamp turns up in a
            house in Lisbon and a café in Riyadh. The same studio works with
            one brand across a decade.
          </p>
          <p>
            None of that is a new idea — it is simply how the work happens.
            Archtivy&apos;s only claim is that discovery should follow the same
            shape.
          </p>
        </div>

        {/* The graph as type, not as a diagram. Reads on a phone, needs no
            illustration, and states the model exactly. */}
        <p className="mt-10 max-w-[46ch] font-display text-[22px] leading-[1.5] tracking-tight text-ink sm:text-[26px]">
          Projects <span className="text-muted">↔</span> Designers{" "}
          <span className="text-muted">↔</span> Products{" "}
          <span className="text-muted">↔</span> Brands
        </p>
        <p className="mt-4 max-w-[52ch] font-body text-[15px] leading-[24px] text-muted">
          Held together by the materials, locations and specifications that
          recur across them.
        </p>
      </MarketingSection>

      {/* The experience, described as a path rather than a feature set. */}
      <MarketingSection heading="Begin anywhere.">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              There is no correct entry point. Arrive at a project and you can
              reach the studio, then the products inside it, then the brands
              behind those, then another project entirely. Arrive at a product
              and you can see the spaces it has been specified into, and who
              chose it.
            </p>
            <p>
              Follow the studios and brands whose decisions interest you. Keep
              what matters on a board. Discovery becomes more relevant as you
              use it, without ever asking you to fill in a profile of your
              tastes.
            </p>
          </div>

          <ol className="space-y-0 divide-y divide-hairline border-y border-hairline">
            {[
              ["Project", "The building, its drawings and its credits."],
              ["Designer", "The studio, and the rest of what they have built."],
              ["Product", "What is actually in the room."],
              ["Brand", "Who makes it, and where else it lives."],
              ["Onward", "Another project. The path does not end."],
            ].map(([step, note], i) => (
              <li key={step} className="flex gap-5 py-5">
                <span className="w-5 shrink-0 pt-[3px] font-body text-[12px] tabular-nums text-muted/70">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-body text-[15px] text-ink">{step}</span>
                  <span className="mt-1 block font-body text-[14px] leading-[22px] text-muted">
                    {note}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </MarketingSection>

      {/* What we are, said without overreach. */}
      <MarketingSection heading="A discovery layer, not a destination.">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              Archtivy is not a directory, a portfolio host or a catalogue,
              though it contains something of each. It is the layer that sits
              between them — the set of connections that lets one lead to the
              next.
            </p>
            <p>
              We do not decide which architecture matters. Studios and brands
              present their own work; the connections between them are what we
              build and maintain.
            </p>
          </div>
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              This is early. The graph is dense in places and thin in others,
              and it grows as studios and brands add their work and credit what
              is in it. Where a connection has not been established yet, we
              would rather show nothing than guess.
            </p>
            <p>
              The ambition is straightforward and long-term: that anyone
              looking at a building can find their way to everything that made
              it.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Start with a project."
        body="Follow it to the studio, the products inside it, and the brands behind those."
        primaryLabel="Explore projects"
        primaryHref="/projects"
        secondaryLabel="Browse products"
        secondaryHref="/products"
      />
    </MarketingPage>
  );
}
