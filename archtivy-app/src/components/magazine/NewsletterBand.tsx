import Link from "next/link";
import { Mail } from "lucide-react";

/**
 * "Stay Inspired" band.
 *
 * STUB — deliberately not a form. No subscription mechanism exists: there is no
 * subscribers table, and Resend is wired for transactional sends only. An email
 * input that accepted an address and dropped it would be worse than no input,
 * so this states plainly that it is not open yet and points at /contact, which
 * is a real form.
 *
 * TODO(newsletter): add a subscribers table + double opt-in, then replace this
 * block with a real input. The reference's social row is also omitted — the
 * Magazine has no accounts of its own; the global footer already carries the
 * platform's real links.
 */
export function NewsletterBand() {
  return (
    <section className="mt-16 flex flex-col items-start gap-5 rounded-xl bg-stone/40 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <Mail strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
        <div>
          <h2 className="font-body text-[15px] text-ink">Stay inspired</h2>
          <p className="mt-1 max-w-[52ch] font-body text-[13px] leading-[20px] text-muted">
            A Magazine newsletter isn&rsquo;t open yet. When it is, it will be announced here
            first.
          </p>
        </div>
      </div>
      <Link
        href="/contact"
        className="shrink-0 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-cream"
      >
        Get in touch
      </Link>
    </section>
  );
}
