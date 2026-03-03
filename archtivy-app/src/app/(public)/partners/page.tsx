import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata = {
  title: "Partner Program | Archtivy",
  description:
    "Partner with Archtivy to connect your platform, institution, or brand with the global architecture intelligence record.",
};

const PARTNER_TYPES = [
  {
    title: "Architecture schools",
    body: "Partner with Archtivy to offer students and faculty a structured platform for documenting and publishing academic and professional work. We provide institutional access, onboarding support, and visibility within the global record.",
  },
  {
    title: "Product brands",
    body: "Verified brand partners gain early access to specification analytics, product intelligence dashboards, and co-development input on brand-facing features. Ideal for architecture product companies seeking to understand their global specification footprint.",
  },
  {
    title: "Technology platforms",
    body: "CMS platforms, BIM tools, and practice management software can integrate with Archtivy via API to enable structured project submission directly from existing workflows. We are building an integration layer for architecture technology.",
  },
  {
    title: "Research institutions",
    body: "Qualified academic and industry research institutions can access aggregated specification data for market studies, urban research, and sustainability analysis. Contact us to discuss your research requirements.",
  },
];

export default function PartnersPage() {
  return (
    <MarketingPage
      label="Partner Program"
      headline="Build on the architecture intelligence record."
      subheadline="Archtivy partners with architecture schools, product brands, technology platforms, and research institutions. Each partnership adds to the network and benefits from it."
    >
      {/* Partner types */}
      <MarketingSection heading="Who we partner with">
        <div className="grid gap-6 sm:grid-cols-2">
          {PARTNER_TYPES.map(({ title, body }) => (
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

      {/* How to apply */}
      <MarketingSection heading="How to apply">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="space-y-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              Partnership discussions begin with a brief introduction. Describe
              your organisation, what you are trying to achieve, and how you
              believe a partnership with Archtivy would work.
            </p>
            <p>
              We evaluate partnerships on strategic alignment, mutual benefit,
              and long-term fit. We do not take on partners purely for
              commercial reasons, and we do not offer generic &quot;sponsor&quot; placements
              or directory-style listings.
            </p>
            <p>
              Use the form to initiate contact. Select &quot;Partnerships&quot; as the
              category. We respond to all partnership inquiries within five
              business days.
            </p>
          </div>
          <ContactForm />
        </div>
      </MarketingSection>
    </MarketingPage>
  );
}
