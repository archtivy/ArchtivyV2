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
      headline="Programmatic access to the architecture intelligence record."
      subheadline="The Archtivy API provides structured access to project, product, and professional data. Documentation is in active development ahead of public release."
    >
      {/* Status notice */}
      <MarketingSection>
        <div className="rounded-[4px] border border-zinc-200 bg-zinc-50 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            API access is not yet publicly available.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            We are building toward a versioned, rate-limited REST API. Early
            access is available for qualified research institutions and brand
            intelligence partners. Contact{" "}
            <a
              href="mailto:api@archtivy.com"
              className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
            >
              api@archtivy.com
            </a>{" "}
            to discuss your use case.
          </p>
        </div>
      </MarketingSection>

      {/* Authentication */}
      <MarketingSection heading="Authentication">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <p>
              The Archtivy API uses bearer token authentication. All requests
              must include a valid API key in the{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
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
          <div className="rounded-[4px] border border-zinc-200 bg-zinc-900 p-5">
            <pre className="overflow-x-auto font-mono text-xs text-zinc-300">
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
        <div className="overflow-hidden rounded-[4px] border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-[80px_1fr_1fr_100px] border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
            <span>Method</span>
            <span>Path</span>
            <span>Description</span>
            <span className="text-right">Status</span>
          </div>
          {ENDPOINTS.map(({ method, path, description, status }) => (
            <div
              key={path}
              className="grid grid-cols-[80px_1fr_1fr_100px] items-start border-b border-zinc-100 px-5 py-4 last:border-0 dark:border-zinc-800/50"
            >
              <span className="font-mono text-xs font-semibold text-[#002abf] dark:text-[#4d6fff]">
                {method}
              </span>
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {path}
              </span>
              <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {description}
              </span>
              <span className="text-right text-[10px] text-zinc-400 dark:text-zinc-600">
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
              className="space-y-2 rounded-[4px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {tier}
              </p>
              <p className="font-mono text-xs text-[#002abf] dark:text-[#4d6fff]">
                {requests}
              </p>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {note}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Contact */}
      <MarketingSection>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          For early API access, technical questions, or partnership
          discussions, contact{" "}
          <a
            href="mailto:api@archtivy.com"
            className="font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            api@archtivy.com
          </a>
          .
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
