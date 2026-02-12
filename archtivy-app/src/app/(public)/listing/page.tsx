import { notFound } from "next/navigation";

// Legacy route removed; use /projects and /products.
export default function LegacyListingIndexPage() {
  notFound();
}
