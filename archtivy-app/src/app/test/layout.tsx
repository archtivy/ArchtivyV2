import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Gate for the development-only /test connectivity check.
 *
 * robots.txt disallows /test/, but Disallow prevents crawling, not indexing — a
 * linked URL can still be indexed URL-only. Returning a real 404 in production is
 * the only reliable answer. See TECHNICAL_SEO_AUDIT.md C-11.
 *
 * Lives in a layout because page.tsx is a client component and cannot export
 * metadata or call notFound() before its hooks.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TestLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
