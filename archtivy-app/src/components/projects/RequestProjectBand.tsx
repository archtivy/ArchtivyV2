import { Inbox } from "lucide-react";

/**
 * "Can't find what you're looking for?" CTA band (brief §4).
 */
export function RequestProjectBand() {
  return (
    <section className="mt-16 rounded-xl border border-hairline bg-stone/40 px-6 py-6">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-start gap-4">
          <Inbox strokeWidth={1.5} className="mt-0.5 hidden h-6 w-6 shrink-0 text-muted sm:block" aria-hidden />
          <div>
            <p className="font-body text-[15px] text-ink">
              Can&rsquo;t find what you&rsquo;re looking for?
            </p>
            <p className="mt-1 font-body text-[13px] text-muted">
              Tell us what you&rsquo;re searching for and we&rsquo;ll help you discover it.
            </p>
          </div>
        </div>

        {/*
          STUB — deliberately not wired.
          There is no project-request flow, table or endpoint. Rather than
          POSTing into nothing, this links to the existing /contact page, which
          is a real, working destination. Replace the href with the request flow
          when one exists.
          TODO(request-a-project): build the request flow, then point this at it.
        */}
        <a
          href="/contact"
          className="inline-flex shrink-0 rounded-full border border-ink/25 px-5 py-2.5 font-body text-[13px] text-ink transition-colors hover:bg-cream"
        >
          Request a Project
        </a>
      </div>
    </section>
  );
}
