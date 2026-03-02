export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";

const SEO_SECTIONS = [
  {
    href: "/admin/seo/projects",
    label: "Projects SEO Audit",
    description: "Title, description, images, alt text, slug, structured data (CreativeWork)",
  },
  {
    href: "/admin/seo/products",
    label: "Products SEO Audit",
    description: "Title, description, Product type, slug, structured data (Product schema)",
  },
  {
    href: "/admin/seo/profiles",
    label: "Profiles SEO Audit",
    description: "Display name, bio, avatar, thin content rule, noindex detection (ProfilePage schema)",
  },
];

export default function AdminSeoPage() {
  return (
    <AdminPage title="SEO Audit Center">
      <p className="mb-6 text-sm text-zinc-500">
        Google Search Central compliant audits. Each check validates indexability, canonical URLs, meta
        fields, image alt text, structured data, and thin content rules.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SEO_SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded border border-zinc-200 bg-white p-5 hover:border-[#002abf] hover:shadow-sm"
          >
            <div className="text-sm font-semibold text-zinc-900 group-hover:text-[#002abf]">
              {s.label}
            </div>
            <p className="mt-2 text-xs text-zinc-500">{s.description}</p>
            <div className="mt-4 text-xs font-medium text-[#002abf]">Open audit →</div>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
