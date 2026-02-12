import { AdminPage } from "@/components/admin/AdminPage";

export default async function AdminClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AdminPage title={`Claim: ${id}`}>
      <p className="text-sm text-zinc-600">Claim detail for id: {id}</p>
    </AdminPage>
  );
}
