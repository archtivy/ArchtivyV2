"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseClass =
  "rounded px-2 py-1 text-[15px] font-medium text-[#2b2b2b] transition-colors hover:text-[#002abf] focus:outline-none focus-visible:bg-[#002abf]/10 focus-visible:ring-0 dark:text-zinc-300 dark:hover:text-[#002abf] dark:focus-visible:bg-[#002abf]/15";
const activeClass = "text-[#002abf] dark:text-[#002abf]";

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
