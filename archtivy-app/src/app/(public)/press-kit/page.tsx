import {
  MarketingPage,
  MarketingSection,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Press Kit | Archtivy",
  description:
    "Brand assets, logo files, color guidelines, and media resources for Archtivy.",
};

export default function PressKitPage() {
  return (
    <MarketingPage
      label="Press Kit"
      headline="Brand assets and media resources."
      subheadline="Official Archtivy logos, color values, usage guidelines, and platform screenshots for editorial use."
    >
      {/* Assets */}
      <MarketingSection heading="Logo files">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Wordmark — Black",
              format: "SVG / PNG",
              note: "For use on white or light backgrounds.",
            },
            {
              title: "Wordmark — White",
              format: "SVG / PNG",
              note: "For use on dark or photographic backgrounds.",
            },
            {
              title: "Icon — Primary",
              format: "SVG / PNG",
              note: "Square icon for avatars, favicons, and app icons.",
            },
          ].map(({ title, format, note }) => (
            <div
              key={title}
              className="space-y-3 rounded-2xl border border-hairline bg-white p-6"
            >
              <div className="flex h-20 items-center justify-center rounded-2xl bg-stone/25">
                <span className="text-xs text-muted/70">
                  Asset placeholder
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">
                  {title}
                </p>
                <p className="text-xs text-muted">
                  {format}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {note}
              </p>
              <button
                disabled
                className="text-xs text-muted/70"
              >
                Download (coming soon)
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">
          Asset files are being prepared. Contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            info@archtivy.com
          </a>{" "}
          to request files in any format.
        </p>
      </MarketingSection>

      {/* Brand colors */}
      <MarketingSection heading="Brand colors">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: "Primary",
              hex: "#002ABF",
              use: "CTAs, links, interactive elements",
              swatch: "bg-[#002abf]",
            },
            {
              name: "Foreground",
              hex: "#18181B",
              use: "Headlines, primary text",
              swatch: "bg-zinc-900",
            },
            {
              name: "Muted text",
              hex: "#71717A",
              use: "Body copy, descriptions",
              swatch: "bg-zinc-500",
            },
            {
              name: "Background",
              hex: "#FAFAFA",
              use: "Page backgrounds, footer",
              swatch: "bg-zinc-50 border border-zinc-200",
            },
          ].map(({ name, hex, use, swatch }) => (
            <div
              key={name}
              className="space-y-3 rounded-2xl border border-hairline bg-white p-5"
            >
              <div className={`h-10 w-full rounded-2xl ${swatch}`} />
              <div>
                <p className="text-sm font-medium text-ink">
                  {name}
                </p>
                <p className="font-mono text-xs text-muted">{hex}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted">
                {use}
              </p>
            </div>
          ))}
        </div>
      </MarketingSection>

      {/* Usage guidelines */}
      <MarketingSection heading="Usage guidelines">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">
              Permitted uses
            </h3>
            <ul className="space-y-2">
              {[
                "Referencing Archtivy in editorial coverage and news articles",
                "Using the logo in press releases and media features",
                "Including screenshots in product reviews or technology coverage",
                "Academic research and industry analysis",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">
              Not permitted
            </h3>
            <ul className="space-y-2">
              {[
                "Modifying, distorting, or recolouring the Archtivy logo",
                "Using Archtivy branding to imply partnership or endorsement",
                "Reproducing platform content at scale without permission",
                "Using the brand in any commercial context without prior approval",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-relaxed text-muted"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-stone" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MarketingSection>

      {/* Contact */}
      <MarketingSection>
        <p className="text-sm leading-relaxed text-muted">
          For asset requests, high-resolution files, or questions about brand
          usage, contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            info@archtivy.com
          </a>
          . We respond to all press requests within two business days.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
