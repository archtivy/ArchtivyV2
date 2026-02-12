"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseClass =
  "rounded px-2 py-1 text-zinc-500 transition hover:text-zinc-900 focus:text-zinc-900 focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus:text-zinc-100";
const activeClass =
  "border-b-2 border-archtivy-primary font-medium text-archtivy-primary";

export function TopNavLinks() {
  const pathname = usePathname();
  const isProjects = pathname?.startsWith("/explore/projects") ?? false;
  const isProducts = pathname?.startsWith("/explore/products") ?? false;
  const isDesigners = pathname?.startsWith("/explore/designers") ?? false;
  const isBrands = pathname?.startsWith("/explore/brands") ?? false;

  return (
    <>
      <Link
        href="/explore/projects"
        className={`${baseClass} ${isProjects ? activeClass : ""}`}
      >
        Projects
      </Link>
      <Link
        href="/explore/products"
        className={`${baseClass} ${isProducts ? activeClass : ""}`}
      >
        Products
      </Link>
      <Link
        href="/explore/designers"
        className={`${baseClass} ${isDesigners ? activeClass : ""}`}
      >
        Designers
      </Link>
      <Link
        href="/explore/brands"
        className={`${baseClass} ${isBrands ? activeClass : ""}`}
      >
        Brands
      </Link>
    </>
  );
}
