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
  { label: "Claims", href: "/admin/claims" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Tools", href: "/admin/tools" },
];
