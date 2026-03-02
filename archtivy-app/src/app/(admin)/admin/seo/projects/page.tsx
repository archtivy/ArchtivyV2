export const dynamic = "force-dynamic";
export const revalidate = 0;

import { SeoAuditClient } from "@/components/admin/SeoAuditClient";

export default function AdminSeoProjectsPage() {
  return <SeoAuditClient entity="projects" />;
}
