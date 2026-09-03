import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { AboutCTAs } from "./AboutCTAs";
import {
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "About Archtivy — Connected Discovery for Architecture and Design",
  description:
    "Archtivy exists because architecture is made through relationships that the web takes apart. We connect projects, architects and design studios, products, and design brands so that discovery can follow how the work was actually made.",
};

/**
 * About — why Archtivy exists.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * "Architecture has always produced intelligence. It was never organised."
 * followed by "What gets indexed" — a four-item list describing nodes,
 * structured fields and queryable records — and "The intelligence layer".
 * It read as documentation for a database, written for someone evaluating a
 * data vendor.
 *
 * This page answers one question instead: why does Archtivy exist. The idea is
 * that architecture is made through relationships, that those relationships
 * are the first thing lost when work goes online, and that making them visible
 * is worth doing. Capabilities appear only where they carry the argument.
 *
 * The header keeps its own markup rather than using MarketingPage, because the
 * call to action here is role-aware (AboutCTAs) and belongs above the fold.
 * Its type scale is matched to MarketingPage deliberately so the two cannot
 * drift apart.
 */
export default async function AboutPage() {
  const { userId } = await auth();
  const profileResult = userId
    ? await getProfileByClerkId(userId)
    : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <article className="space-y-20 pb-24 sm:space-y-24">
      <header className="space-y-6 pt-10 sm:pt-16">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          About
        </p>
        <h1 className="max-w-[20ch] font-display text-[34px] leading-[1.08] tracking-tight text-ink sm:text-[44px] lg:text-[52px]">
          Architecture is made through relationships.
        </h1>
        <p className="max-w-[58ch] font-body text-[17px] leading-[27px] text-muted">
          A studio, a drawing, a decision about a material, a product chosen
          over another. The building is the record of all of it. Put that
          building online and the relationships are the first thing to go.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <AboutCTAs userId={userId} role={role} />
        </div>
      </header>

      <MarketingSection heading="Why this exists">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[58ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              The web has been generous to architecture. There are more
              photographs, more drawings and more writing about buildings than
              at any point in the discipline&apos;s history. What it has not
              produced is a way through.
            </p>
            <p>
              A project lives on one site. The studio that designed it keeps a
              portfolio on another. The furniture inside it is catalogued by a
              manufacturer who has never seen that room. Each page is complete
              on its own terms and ends where the next one should begin.
            </p>
          </div>
          <div className="max-w-[58ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              So the ordinary questions turn out to be hard. What is that
              chair. Who else has specified it. What else has this studio
              built. Which brands does it return to. Anyone who has tried
              knows the answer usually arrives by accident, or not at all.
            </p>
            <p>
              Archtivy exists to make those relationships visible — not to
              collect more architecture, but to connect what is already there.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection heading="What we connect">
        {/* Four plain statements. The previous version presented these as
            "what gets indexed", which described storage; what matters to a
            reader is what each one leads to. */}
        <ul className="divide-y divide-hairline border-y border-hairline">
          {[
            [
              "Projects",
              "Buildings and interiors, with the studio that designed them and the products specified inside — where those have been credited.",
            ],
            [
              "Architects and design studios",
              "A body of work rather than a single entry, reachable from any project it produced.",
            ],
            [
              "Products",
              "Furniture, lighting, surfaces and building products, shown alongside the spaces they have been used in.",
            ],
            [
              "Design brands",
              "The makers behind those products, and the projects their work has ended up in.",
            ],
          ].map(([title, body]) => (
            <li key={title} className="grid gap-2 py-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
              <h3 className="font-body text-[15px] text-ink">{title}</h3>
              <p className="max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
          Materials, locations and recurring specifications hold these
          together. A material links a project to the products that carry it; a
          city links a studio to the work around it.
        </p>
      </MarketingSection>

      <MarketingSection heading="How we work">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[58ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              Studios and brands present their own work. We do not rank
              architecture or decide which projects deserve attention — the
              connections between them are what we build.
            </p>
            <p>
              Some of those connections are stated by the people who made the
              work. Others are suggested visually, by resemblance, and we say
              which is which. A product credited as used in a project is not
              the same claim as a product that merely looks similar, and the
              two are never presented as though they were.
            </p>
          </div>
          <div className="max-w-[58ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              Where a relationship has not been established, we show nothing
              rather than fill the gap. An empty section is honest. An invented
              credit is not.
            </p>
            <p>
              This is deliberately early work. The network is dense in some
              categories and sparse in others, and it becomes more useful as
              studios and brands add their work and credit what is in it.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection heading="What we are building toward">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            That anyone looking at a building can find their way to everything
            that made it — the studio, the products, the brands, the materials
            — and keep going from there.
          </p>
          <p>
            That a studio&apos;s work is discoverable through the products
            inside it, and a brand&apos;s products through the spaces they
            appear in. That the relationships architecture is already built on
            survive the journey online.
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading="Start anywhere."
        body="Open a project and follow it outward, or begin with a product and see where it lives."
        primaryLabel="Explore projects"
        primaryHref="/projects"
        secondaryLabel="Browse products"
        secondaryHref="/products"
      />
    </article>
  );
}
