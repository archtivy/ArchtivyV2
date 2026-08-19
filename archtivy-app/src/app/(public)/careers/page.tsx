import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Careers | Archtivy",
  description:
    "Work at Archtivy. We are building the intelligence infrastructure for global architecture.",
};

const PRINCIPLES = [
  {
    title: "Structural thinking",
    body: "We design systems before we design surfaces. Every decision — product, engineering, content — is evaluated for its structural effect on the platform.",
  },
  {
    title: "Precision over volume",
    body: "We do not optimise for speed at the expense of accuracy. The record we are building must be correct. We move deliberately.",
  },
  {
    title: "Long-term orientation",
    body: "We are building infrastructure that should outlast any individual feature or funding cycle. Decisions are evaluated over years, not quarters.",
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
      headline="Building the permanent record of global architecture."
      subheadline="Archtivy is an early-stage team working on a difficult, structural problem. If you want to work on something that matters to a specific industry in a lasting way, read on."
    >
      {/* Culture principles */}
      <MarketingSection heading="How we work">
        <div className="grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map(({ title, body }) => (
            <div key={title} className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight text-ink">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">
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
              We are particularly interested in people with direct experience
              in architectural practice, construction technology, data systems,
              or B2B product growth.
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted">
              Contact
            </p>
            <a
              href="mailto:info@archtivy.com"
              className="mt-3 block text-base font-medium text-archtivy-primary hover:underline dark:text-[#4d6fff]"
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
