import Link from "next/link";
import { Bookmark, LogOut, Pencil, Settings, User } from "lucide-react";

/**
 * The whole dashboard for a `reader` account.
 *
 * ── ABSENT, NOT EMPTY ───────────────────────────────────────────────────────
 * A reader does not publish, so there is no listings section here, no stats, no
 * activity feed, no promote card and no create button — not zeroed-out versions
 * of them. This component imports none of those pieces, which is the point: the
 * rich layout is unreachable from this branch rather than merely hidden.
 *
 * The role branch itself lives in getDashboardData(), which returns null for
 * any non-publishing role. `default`, not `case "reader"` — a role added later
 * lands here safely instead of leaking a publisher surface.
 *
 * Matches the shared-skeleton decision already taken for the profile pages.
 *
 * Saved is included even though it is not in the header profile dropdown: it is
 * reached from the bookmark icon in the nav, and it is the one surface a reader
 * genuinely uses.
 */

const ITEMS = [
  { label: "View profile", href: "/me", icon: User, note: "Your public page" },
  { label: "Edit profile", href: "/me/profile", icon: Pencil, note: "Name, bio, links" },
  { label: "Saved", href: "/me/saved", icon: Bookmark, note: "Your boards" },
  { label: "Account settings", href: "/me/settings", icon: Settings, note: "Email and account" },
];

export function ReaderDashboard({ displayName }: { displayName: string }) {
  return (
    <div className="mx-auto max-w-[640px] space-y-8">
      <header>
        <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">
          {displayName}
        </p>
        <h1 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.02em] text-ink">
          Your account
        </h1>
        <p className="mt-3 max-w-[46ch] font-body text-[15px] leading-[24px] text-muted">
          Browse projects, products and designers, and save what you want to
          come back to.
        </p>
      </header>

      <nav aria-label="Account">
        <ul className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white">
          {ITEMS.map(({ label, href, icon: Icon, note }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-stone/30"
              >
                <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-body text-[14px] text-ink">{label}</span>
                  <span className="block font-body text-[12px] text-muted">{note}</span>
                </span>
              </Link>
            </li>
          ))}
          <li>
            {/* Clerk's signOut needs a client component; the header menu
                already owns that. Linking there keeps this whole surface a
                server render rather than adding a client island for one row. */}
            <Link
              href="/"
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-stone/30"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-[14px] text-ink">Sign out</span>
                <span className="block font-body text-[12px] text-muted">
                  From the account menu in the header
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      <section className="rounded-2xl border border-hairline bg-stone/25 p-6">
        <h2 className="font-body text-[15px] font-medium text-ink">
          Want to publish your own work?
        </h2>
        <p className="mt-2 max-w-[48ch] font-body text-[13px] leading-[21px] text-muted">
          Designer and brand accounts can publish projects and products. Your
          account type is set during onboarding — get in touch if it needs
          changing.
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
        >
          Contact us
        </Link>
      </section>
    </div>
  );
}
