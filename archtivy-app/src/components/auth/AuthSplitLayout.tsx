"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-2 focus:ring-archtivy-primary/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass =
  "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";

export { inputClass as authInputClass, labelClass as authLabelClass };

interface AuthSplitLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Left panel marketing copy (Archtivy tone) */
  leftCopy?: {
    heading: string;
    body: string;
  };
}

const defaultLeftCopy = {
  heading: "Projects, products & credits for architecture",
  body: "Discover and share design work, materials, and resources. One place for architects, designers, and brands.",
};

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  leftCopy = defaultLeftCopy,
}: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Left: image / gradient + copy */}
      <div
        className="relative hidden min-h-[200px] flex-1 md:flex md:min-h-screen md:flex-col md:justify-between md:p-10 lg:p-14"
        style={{
          background:
            "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #020617 100%)",
        }}
      >
        <Link
          href="/"
          className="absolute left-6 top-6 text-sm text-white/80 transition hover:text-white"
        >
          ← Back to website
        </Link>
        <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-10 md:py-0">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl lg:text-4xl">
            {leftCopy.heading}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 md:text-base">
            {leftCopy.body}
          </p>
        </div>
      </div>

      {/* Right: form card */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-10 dark:bg-zinc-950 md:px-12 lg:px-16">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 md:hidden"
        >
          ← Back to website
        </Link>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
