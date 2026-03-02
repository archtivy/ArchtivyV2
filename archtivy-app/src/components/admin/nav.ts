export type AdminNavItem = {
  label: string;
  href: string;
};

/** Admin sidebar nav items in order. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Profiles", href: "/admin/profiles" },
  { label: "Projects", href: "/admin/projects" },
  { label: "Products", href: "/admin/products" },
  { label: "SEO", href: "/admin/seo" },
  { label: "Featured & Sponsors", href: "/admin/featured" },
  { label: "Taxonomies", href: "/admin/taxonomies" },
  { label: "Claims", href: "/admin/claims" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Tools", href: "/admin/tools" },
  { label: "Settings", href: "/admin/settings" },
];
