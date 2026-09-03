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
        <p className="mt-6 max-w-[68ch] text-xs text-muted">
          Asset files are being prepared. Contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="text-archtivy-primary hover:underline"
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
            /*
             * ── THESE WERE NOT THE BRAND COLOURS ──────────────────────────
             * A press kit is what a journalist or a partner reproduces the
             * brand from, so publishing the wrong values here propagates them
             * outward. Every entry was wrong: #002ABF as the accent (the
             * accent is #173DED — #002ABF has never been in the token set),
             * #0B0B0B as primary, and zinc-900 / zinc-500 / #FAFAFA for text
             * and ground, none of which appear anywhere in the product.
             *
             * These now read from tailwind.config: cream #F3F2EE, ink #161616,
             * muted #6B6B68, hairline #E4E1D9, archtivy.primary #173DED. The
             * swatch class and the printed hex are set from the same value so
             * the square can never disagree with the label beside it.
             */
            {
              name: "Ink",
              hex: "#161616",
              use: "Headlines, body text, the wordmark, primary buttons",
              swatch: "bg-[#161616]",
            },
            {
              name: "Cream",
              hex: "#F3F2EE",
              use: "Page background",
              swatch: "bg-[#F3F2EE] border border-hairline",
            },
            {
              name: "Muted",
              hex: "#6B6B68",
              use: "Captions, metadata, secondary text",
              swatch: "bg-[#6B6B68]",
            },
            {
              name: "Accent",
              hex: "#173DED",
              use: "Links, active states, focus rings",
              swatch: "bg-[#173DED]",
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
                  className="flex max-w-[68ch] items-start gap-3 text-sm leading-relaxed text-muted"
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
                  className="flex max-w-[68ch] items-start gap-3 text-sm leading-relaxed text-muted"
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
        <p className="max-w-[68ch] text-sm leading-relaxed text-muted">
          For asset requests, high-resolution files, or questions about brand
          usage, contact{" "}
          <a
            href="mailto:info@archtivy.com"
            className="font-medium text-archtivy-primary hover:underline"
          >
            info@archtivy.com
          </a>
          . We respond to all press requests within two business days.
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}
