import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Press | Archtivy",
  description:
    "Press resources, key facts and media contact for Archtivy — a connected discovery platform for architecture and design, linking projects, studios, products and brands.",
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
    value: "Architecture and design discovery",
  },
  {
    label: "What it does",
    value: "Connects projects, studios, products and brands",
  },
  {
    label: "Who uses it",
    value: "Architects, interior designers, design studios, design brands",
  },
  /*
   * "Geographic reach: Global" was removed rather than restated. It was a
   * claim about scale, and at this stage a reach figure invites a follow-up
   * question the platform cannot yet answer honestly.
   */
  {
    label: "Stage",
    value: "Early — the network grows as studios and brands add their work",
  },
];

export default function PressPage() {
  return (
    <MarketingPage
      label="Press"
      headline="Press and media."
      subheadline="Archtivy is a connected discovery platform for architecture and design. It links architecture projects to the studios that designed them, the products specified inside them, and the brands that make those products."
    >
      {/* Boilerplate */}
      <MarketingSection heading="About Archtivy">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-muted">
            <p>
              Archtivy is a connected discovery platform for architecture and
              design. Architecture online is fragmented — projects sit on one
              site, products in catalogues, studios in portfolios, brands
              elsewhere. Archtivy connects them, so a reader can move from a
              project to the studio that designed it, to the products specified
              inside it, to the brands behind those, and onward.
            </p>
            <p>
              Architects and design studios use Archtivy to present projects in
              the context of what is actually in them and to credit the people
              and products involved. Design brands use it so their furniture,
              lighting and building products are found inside the spaces they
              were specified into rather than only in a catalogue.
            </p>
            <p>
              Archtivy is not a portfolio host, a product catalogue or a media
              outlet, though it touches each. It is the discovery layer between
              them: the connections that let one lead to the next. It is early,
              and the network grows as studios and brands add their work.
            </p>
          </div>

          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-white">
            {KEY_FACTS.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-start justify-between gap-6 px-5 py-3.5"
              >
                <span className="text-xs text-muted">
                  {label}
                </span>
                <span className="text-right text-xs font-medium text-ink/80">
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
          <div className="rounded-2xl border border-hairline bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              Media inquiries
            </h3>
            <p className="mt-3 text-sm text-muted">
              Editorial contact, interviews, data requests, and coverage
              coordination.
            </p>
            <a
              href="mailto:info@archtivy.com"
              className="mt-4 block text-sm font-medium text-archtivy-primary hover:underline"
            >
              info@archtivy.com
            </a>
          </div>

          <div className="rounded-2xl border border-hairline bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              Press kit
            </h3>
            <p className="mt-3 text-sm text-muted">
              Brand assets, logos, product screenshots, and founder
              information.
            </p>
            <a
              href="/press-kit"
              className="mt-4 block text-sm font-medium text-archtivy-primary hover:underline"
            >
              Download press kit →
            </a>
          </div>

          <div className="rounded-2xl border border-hairline bg-white p-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              General contact
            </h3>
            <p className="mt-3 text-sm text-muted">
              Partnership discussions, platform questions, and general
              inquiries.
            </p>
            <a
              href="mailto:info@archtivy.com"
              className="mt-4 block text-sm font-medium text-archtivy-primary hover:underline"
            >
              info@archtivy.com
            </a>
          </div>
        </div>
      </MarketingSection>

      {/* Coverage note */}
      <MarketingSection heading="Coverage">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Coverage and feature articles will be listed here as they are
          published. For publication or broadcast enquiries, contact the press
          team directly.
        </p>
      </MarketingSection>

      <MarketingCTA
        heading="Explore the platform."
        body="See how projects, studios, products and brands connect on the platform today."
        primaryLabel="Explore Projects"
        primaryHref="/explore/projects"
        secondaryLabel="Explore Products"
        secondaryHref="/explore/products"
      />
    </MarketingPage>
  );
}
