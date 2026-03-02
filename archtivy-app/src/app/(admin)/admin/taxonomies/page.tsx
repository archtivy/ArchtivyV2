export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TaxonomiesClient } from "@/components/admin/TaxonomiesClient";

export default function AdminTaxonomiesPage() {
  return <TaxonomiesClient />;
}
