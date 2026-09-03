import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "API Documentation | Archtivy",
  description:
    "Archtivy API overview — authentication, endpoints, rate limits, and integration contact.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/projects",
    description: "List projects with structured credit and product data.",
    status: "In development",
  },
  {
    method: "GET",
    path: "/v1/projects/:slug",
    description: "Retrieve a single project by slug with full structured data.",
    status: "In development",
  },
  {
    method: "GET",
    path: "/v1/products",
    description: "List products with specification metadata.",
    status: "In development",
  },
  {
    method: "GET",
    path: "/v1/products/:slug",
    description: "Retrieve a single product by slug.",
    status: "In development",
  },
  {
    method: "GET",
    path: "/v1/profiles/:username",
    description: "Retrieve a professional profile with associated project history.",
    status: "In development",
  },
];

export default function ApiDocsPage() {
  return (
    <MarketingPage
      label="API Documentation"
      headline="Programmatic access to the Archtivy graph."
      subheadline="Structured access to projects, products, studios and brands, and the connections between them. The API is not open yet — this documents the intended shape ahead of release."
    >
      {/* Status notice */}
      <MarketingSection>
        <div className="rounded-2xl border border-hairline bg-stone/25 px-6 py-5">
          <p className="text-sm font-medium text-ink">
            API access is not yet publicly available.
          </p>
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted">
            We are building toward a versioned, rate-limited REST API. Early
            access is available for qualified research institutions and brand
            intelligence partners. Contact{" "}
            <a
              href="mailto:info@archtivy.com"
              className="text-archtivy-primary hover:underline"
            >
              info@archtivy.com
            </a>{" "}
            to discuss your use case.
          </p>
        </div>
      </MarketingSection>

      {/* Authentication */}
      <MarketingSection heading="Authentication">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[68ch] space-y-4 text-sm leading-relaxed text-muted">
            <p>
              The Archtivy API uses bearer token authentication. All requests
              must include a valid API key in the{" "}
              <code className="rounded bg-stone/40 px-1.5 py-0.5 font-mono text-xs text-ink/80">
                Authorization
              </code>{" "}
              header.
            </p>
            <p>
              API keys are issued per organisation and tied to specific
              permission scopes. Keys are not publicly available during the
              early access period.
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-ink p-5">
            <pre className="overflow-x-auto font-mono text-xs text-muted/70">
              {`Authorization: Bearer arch_live_xxxxxxxxxxxxx

GET /v1/projects HTTP/1.1
Host: api.archtivy.com
Accept: application/json`}
            </pre>
          </div>
        </div>
      </MarketingSection>

      {/* Endpoints */}
      <MarketingSection heading="Endpoints overview">
        <div className="overflow-hidden rounded-2xl border border-hairline">
          {/* Column headings are for the table layout only, so they are
              hidden once the rows stack. `text-muted 0` here was a stray
              fragment left by an earlier edit — "0" is not a class. */}
          <div className="hidden border-b border-hairline bg-stone/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted sm:grid sm:grid-cols-[80px_1fr_1fr_100px]">
            <span>Method</span>
            <span>Path</span>
            <span>Description</span>
            <span className="text-right">Status</span>
          </div>
          {ENDPOINTS.map(({ method, path, description, status }) => (
            <div
              key={path}
              /* Four fixed columns needed 80px + 100px plus two content
                 columns, which overflowed a 390px viewport by up to 55px —
                 measured, and not inside a scroll container. The row stacks
                 below sm instead. ("/50" was another stray fragment.) */
              className="grid items-start gap-1 border-b border-hairline px-5 py-4 last:border-0 sm:grid-cols-[80px_1fr_1fr_100px] sm:gap-0"
            >
              <span className="font-mono text-xs font-semibold text-archtivy-primary">
                {method}
              </span>
              <span className="font-mono text-xs text-muted">
                {path}
              </span>
              <span className="text-xs leading-relaxed text-muted">
                {description}
              </span>
              <span className="text-[10px] text-muted sm:text-right">
                {status}
              </span>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Rate limits */}
      <MarketingSection heading="Rate limits">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              tier: "Standard",
              requests: "1,000 / day",
              note: "Default for research and integration partners",
            },
            {
              tier: "Professional",
              requests: "10,000 / day",
              note: "Available for qualified brand intelligence users",
            },
            {
              tier: "Enterprise",
              requests: "Custom",
              note: "Contact for volume agreements and SLA",
            },
          ].map(({ tier, requests, note }) => (
            <div
              key={tier}
              className="space-y-2 rounded-2xl border border-hairline bg-white p-5"
            >
              <p className="text-sm font-semibold text-ink">
                {tier}
              </p>
              <p className="font-mono text-xs text-archtivy-primary">
                {requests}
              </p>
              <p className="text-xs leading-relaxed text-muted">
                {note}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Contact */}
      <MarketingSection>
        <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
          For early API access, technical questions, or partnership
          discussions, contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="font-medium text-archtivy-primary hover:underline"
          >
            info@archtivy.com
          </a>
          .
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
