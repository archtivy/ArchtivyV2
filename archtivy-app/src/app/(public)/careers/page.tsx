import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Careers at Archtivy",
  description:
    "Work at Archtivy. A small, senior team connecting architecture projects, design studios, products and brands so that discovery can follow the relationships behind the work.",
};

const PRINCIPLES = [
  {
    title: "Structural thinking",
    body: "We design the relationships before the screens. What can be connected, and how honestly, decides what the interface is allowed to claim.",
  },
  {
    title: "Precision over volume",
    body: "A connection that is wrong is worse than one that is missing. Where we cannot establish a relationship honestly, we show nothing — and we would rather ship less than guess.",
  },
  {
    title: "Long-term orientation",
    body: "The connections between projects, products and studios should still be useful in ten years. Decisions get evaluated over that horizon, not over a quarter.",
  },
  {
    title: "Small and senior",
    body: "We maintain a small team of experienced people. We do not hire to expand headcount. We hire when the work cannot be done well without a specific person.",
  },
];

export default function CareersPage() {
  return (
    <MarketingPage
      label="Careers"
      headline="A small team, connecting a fragmented discipline."
      subheadline="Architecture is documented well and joined up badly. Archtivy exists to connect projects to the studios, products and brands behind them. It is early, the problem is specific, and the work is more careful than fast."
    >
      {/* Culture principles */}
      <MarketingSection heading="How we work">
        <div className="grid gap-10 sm:grid-cols-2">
          {PRINCIPLES.map(({ title, body }) => (
            <div key={title} className="space-y-2">
              <h3 className="font-body text-[15px] text-ink">
                {title}
              </h3>
              <p className="max-w-[52ch] font-body text-[15px] leading-[25px] text-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Open roles */}
      <MarketingSection heading="Open roles">
        <div className="rounded-2xl border border-hairline bg-white p-8">
          <p className="text-sm font-medium text-ink">
            No open roles at this time.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            We are not currently hiring for specific positions. When we do, we
            will post them here first. We do not work with recruiters or
            placement agencies.
          </p>
        </div>
      </MarketingSection>

      {/* Register interest */}
      <MarketingSection heading="Register interest">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-sm leading-relaxed text-muted">
            <p>
              If you are an experienced engineer, designer, or domain expert in
              the architecture or construction industry and want to be
              considered when positions open, send a brief introduction and
              description of your background.
            </p>
            <p>
              We are particularly interested in people who have worked inside
              architectural or interior practice, and in engineers who care
              about data being correct rather than merely present.
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              Contact
            </p>
            <a
              href="mailto:info@archtivy.com"
              className="mt-3 block font-body text-[16px] text-archtivy-primary hover:underline"
            >
              info@archtivy.com
            </a>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Include your background, the type of work you are interested in,
              and anything relevant you have built or contributed to. We read
              every message.
            </p>
          </div>
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
