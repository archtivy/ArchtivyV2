import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import {
  MarketingPage,
  MarketingSection,
  MarketingCTA,
} from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "How Archtivy Works — Discover Projects, Products, Studios and Brands",
  description:
    "Start with an architecture project and follow it to the studio behind it, the design products specified inside, and the brands that make them. How discovery works on Archtivy, for readers, design studios and brands.",
};

/**
 * How it works — explained as discovery.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * Five numbered steps titled "Create a profile", "Submit a project",
 * "Attribute structured credits", "Tag the products", "Join the network" —
 * a publishing tutorial. It answered "how do I upload work to Archtivy",
 * which is not the question a visitor arrives with, and it described the
 * result as "the global record".
 *
 * The page now opens with what a reader can do, because that is what the
 * product is for. Contributing follows, and is split by audience, since a
 * studio and a brand come here for different reasons. There is no separate
 * "For designers" or "For brands" page in this codebase and none was created;
 * both arguments live here.
 */

/** The discovery path. Deliberately the same five moves the product supports. */
const PATH = [
  {
    n: "01",
    title: "Start with a project",
    body: "A house in Antwerp, a café in Riyadh, an office fit-out. Photographs, location, year, and the studio credited with it.",
  },
  {
    n: "02",
    title: "Meet the studio",
    body: "Open the practice behind it and see the rest of their work — not a single entry, a body of work you can move through.",
  },
  {
    n: "03",
    title: "Find what is in the room",
    body: "Where products have been credited, they appear with the project. Open the photograph and explore pieces that suit the space, or click an object to find ones like it.",
  },
  {
    n: "04",
    title: "Reach the brand",
    body: "Every product leads to the brand that makes it, and to the other spaces their work has been specified into.",
  },
  {
    n: "05",
    title: "Keep going",
    body: "From that brand to another project, another studio, another material. There is no last page.",
  },
];

export default async function HowItWorksPage() {
  const { userId } = await auth();
  const profileResult = userId ? await getProfileByClerkId(userId) : { data: null };
  const role = profileResult.data?.role ?? undefined;

  return (
    <MarketingPage
      label="How it works"
      headline="See the project. Find the product. Meet the studio."
      subheadline="Archtivy connects architecture projects to the studios that designed them, the products specified inside, and the brands that make those. You can begin at any point and keep going."
    >
      <MarketingSection heading="The path">
        {/* Hairline rows, not cards. Five bordered boxes read as a feature
            grid; this reads as a sequence, which is what it is. */}
        <ol className="divide-y divide-hairline border-y border-hairline">
          {PATH.map(({ n, title, body }) => (
            <li key={n} className="grid gap-3 py-7 sm:grid-cols-[3.5rem_1fr] sm:gap-8">
              <span className="font-body text-[13px] tabular-nums text-muted/70">{n}</span>
              <div>
                <h3 className="font-display text-[20px] leading-[1.2] tracking-tight text-ink">
                  {title}
                </h3>
                <p className="mt-2 max-w-[58ch] font-body text-[15px] leading-[25px] text-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection heading="Two kinds of connection">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-5 font-body text-[16px] leading-[27px] text-muted">
            <p>
              <span className="text-ink">Credited.</span> Someone who worked on
              the project said this product is in it. That is a statement of
              fact and it is presented as one.
            </p>
            <p>
              <span className="text-ink">Visually similar.</span> Open a
              project photograph and the panel beside it suggests pieces that
              suit the space; click an object and it narrows to things like
              that object. These are suggestions based on how things look —
              useful for finding a direction, not a claim about what was
              specified.
            </p>
          </div>
          <div className="max-w-[54ch] space-y-5 font-body text-[16px] leading-[27px] text-muted">
            <p>
              The two are never mixed. A credited product is labelled as used
              in the project; a suggestion never carries that label, whatever
              the resemblance.
            </p>
            <p>
              It matters because specification is a professional decision.
              Guessing at it and presenting the guess as a credit would make
              the whole record worth less.
            </p>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection heading="What you keep">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            Save a project or a product to a board — one for a scheme you are
            developing, one for lighting you keep returning to. Follow the
            studios and brands whose decisions interest you, and their new work
            reaches you.
          </p>
          <p>
            Your homepage draws on that: what you follow, what you save, where
            you are. It becomes more relevant the more you use it, and it never
            asks you to describe your taste in a form. Discovery outside your
            established interests stays in the mix deliberately.
          </p>
        </div>
      </MarketingSection>

      {/* ── For design studios ─────────────────────────────────────────── */}
      <MarketingSection heading="For architects and design studios">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              A project on a portfolio site is a dead end by design — it shows
              the work and stops. On Archtivy a project sits inside the network
              that produced it: the products specified, the brands behind them,
              the materials, the city.
            </p>
            <p>
              That gives your work more than one way in. Someone looking for a
              particular lamp can arrive at your project through it. Someone
              reading about a brand can find the space where their work was
              used.
            </p>
          </div>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {[
              "Present projects in the context of what is actually in them.",
              "Credit the studios, engineers and photographers you worked with, and be credited in return.",
              "Let a body of work be discoverable as a whole, not one entry at a time.",
              "Keep a professional profile that other people can reach from any project.",
            ].map((t) => (
              <li key={t} className="py-5 font-body text-[15px] leading-[24px] text-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      {/* ── For brands ─────────────────────────────────────────────────── */}
      <MarketingSection heading="For design brands">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div className="max-w-[54ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
            <p>
              A catalogue shows a product against a white background. It cannot
              show the thing a specifier actually wants to see: the product in
              a room, at that scale, next to those materials, chosen by a
              studio whose judgement they trust.
            </p>
            <p>
              Show where your products live. On Archtivy a product carries the
              projects it has been specified into, and each of those leads back
              to the space and the studio.
            </p>
          </div>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {[
              "Products shown in the projects they were specified into.",
              "A brand profile reachable from every one of those products.",
              "Discovery by category, material and typology, not only by product name.",
              "Visibility inside real spaces rather than beside them.",
            ].map((t) => (
              <li key={t} className="py-5 font-body text-[15px] leading-[24px] text-muted">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </MarketingSection>

      <MarketingSection heading="Adding your work">
        <div className="max-w-[62ch] space-y-6 font-body text-[16px] leading-[27px] text-muted">
          <p>
            Publishing a project takes a title, a location, images and the
            credits. Crediting the products inside it is what connects the
            project to the brands and to everyone searching by product — it is
            optional, and it is the part that does the work.
          </p>
          <p>
            Brands publish products with their category, materials and
            dimensions. As studios credit them, each product accumulates the
            projects it appears in.
          </p>
        </div>
      </MarketingSection>

      <MarketingCTA
        heading={role === "brand" ? "Show where your products live." : "Start with a project."}
        body={
          role === "brand"
            ? "Publish your products and let them be found inside the spaces they were specified into."
            : "Follow it to the studio, the products inside it, and the brands behind those."
        }
        primaryLabel="Explore projects"
        primaryHref="/projects"
        secondaryLabel="Browse products"
        secondaryHref="/products"
      />
    </MarketingPage>
  );
}
