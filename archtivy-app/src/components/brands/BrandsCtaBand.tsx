import Link from "next/link";
import { Lightbulb, Mail, ArrowRight } from "lucide-react";

/**
 * Bottom CTA band (brief §5). Three blocks, three real destinations — none of
 * them wired to nothing:
 *
 *   Suggest a Brand   STUB. No suggestion flow, table or endpoint exists.
 *                     Points at /contact, which is a real form with a category
 *                     selector, rather than posting into nowhere. Same handling
 *                     as "Request a Project" and "Request a Quote".
 *                     TODO(suggest-a-brand): build the flow, then repoint this.
 *   Partner With Us   REAL. /partners exists and has an explicit "Product
 *                     brands" section plus a working ContactForm.
 *   Learn more        REAL. /how-it-works. The reference pointed this third
 *                     block at the same place as the second; sending both to
 *                     /partners would be a visible redundancy.
 */
export function BrandsCtaBand() {
  return (
    <section className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-hairline sm:grid-cols-3">
      <Block
        Icon={Lightbulb}
        title="Can’t find a brand?"
        body="Suggest a brand and help widen what the archive covers."
        cta="Suggest a Brand"
        href="/contact"
      />
      <Block
        Icon={Mail}
        title="For brands"
        body="Partner with Archtivy to show your products to architects and designers."
        cta="Partner With Us"
        href="/partners"
      />
      <Block
        Icon={ArrowRight}
        title="Join leading brands on Archtivy"
        body="See how listings, specification and the product record work."
        cta="Learn more"
        href="/how-it-works"
      />
    </section>
  );
}

function Block({
  Icon,
  title,
  body,
  cta,
  href,
}: {
  Icon: typeof Mail;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col bg-stone/40 p-6">
      <Icon strokeWidth={1.5} className="h-5 w-5 text-muted" aria-hidden />
      <h3 className="mt-4 font-body text-[15px] text-ink">{title}</h3>
      <p className="mt-1.5 flex-1 font-body text-[13px] leading-[20px] text-muted">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-cream"
      >
        {cta}
        <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
