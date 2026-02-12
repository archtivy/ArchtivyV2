import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export interface MaterialRow {
  id: string;
  display_name: string;
  slug: string;
}

const supabase = () => getSupabaseServiceClient();

export async function getProjectMaterialOptions(): Promise<MaterialRow[]> {
  const { data, error } = await supabase()
    .from("materials")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[materials] project options error:", error.message);
    }
    return [];
  }
  return (data ?? []).map((r) => normalizeMaterialRow(r)).filter(Boolean) as MaterialRow[];
}

export async function getProductMaterialOptions(): Promise<MaterialRow[]> {
  const { data, error } = await supabase()
    .from("materials")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[materials] product options error:", error.message);
    }
    return [];
  }
  return (data ?? []).map((r) => normalizeMaterialRow(r)).filter(Boolean) as MaterialRow[];
}

export async function getMaterialsByProjectIds(
  projectIds: string[]
): Promise<Record<string, MaterialRow[]>> {
  if (projectIds.length === 0) return {};
  // Two-step fetch (links -> materials) avoids relying on embedded relationship names.
  const { data: links, error: linkErr } = await supabase()
    .from("project_material_links")
    .select("project_id, material_id")
    .in("project_id", projectIds);

  if (linkErr) {
    console.warn("[materials] project_material_links unavailable:", linkErr.message);
    return {};
  }

  const map: Record<string, MaterialRow[]> = {};
  for (const pid of projectIds) map[pid] = [];

  const rows = (links ?? []) as { project_id: string | null; material_id: string | null }[];
  const materialIds = Array.from(new Set(rows.map((r) => r.material_id).filter(Boolean) as string[]));
  if (materialIds.length === 0) return map;

  const { data: mats, error: matErr } = await supabase()
    .from("materials")
    .select("id, name, slug")
    .in("id", materialIds);

  if (matErr) {
    console.warn("[materials] materials unavailable:", matErr.message);
    return map;
  }

  const byId = new Map<string, MaterialRow>();
  for (const m of mats ?? []) {
    const norm = normalizeMaterialRow(m);
    if (norm) byId.set(norm.id, norm);
  }

  for (const r of rows) {
    const pid = r.project_id ?? null;
    const mid = r.material_id ?? null;
    if (!pid || !mid) continue;
    const mat = byId.get(mid);
    if (!mat) continue;
    map[pid]?.push(mat);
  }

  return map;
}

function normalizeMaterialRow(raw: unknown): MaterialRow | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.length ? normalizeMaterialRow(raw[0]) : null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id === "string" && typeof o.slug === "string") {
    // Canonical return shape for the rest of the app is { id, slug, display_name }.
    // For public.materials, the column is `name`, so we map it to display_name.
    const display_name =
      typeof o.display_name === "string"
        ? o.display_name
        : typeof o.name === "string"
          ? o.name
          : null;
    if (display_name) return { id: o.id, display_name, slug: o.slug };
  }
  return null;
}

export async function getMaterialsByProductIds(
  productIds: string[]
): Promise<Record<string, MaterialRow[]>> {
  if (productIds.length === 0) return {};
  const { data: links, error: linkErr } = await supabase()
    .from("product_material_links")
    .select("product_id, material_id")
    .in("product_id", productIds);

  if (linkErr) {
    console.warn("[materials] product_material_links unavailable:", linkErr.message);
    return {};
  }

  const map: Record<string, MaterialRow[]> = {};
  for (const pid of productIds) map[pid] = [];

  const rows = (links ?? []) as { product_id: string | null; material_id: string | null }[];
  const materialIds = Array.from(new Set(rows.map((r) => r.material_id).filter(Boolean) as string[]));
  if (materialIds.length === 0) return map;

  const { data: mats, error: matErr } = await supabase()
    .from("materials")
    .select("id, name, slug")
    .in("id", materialIds);

  if (matErr) {
    console.warn("[materials] materials unavailable:", matErr.message);
    return map;
  }

  const byId = new Map<string, MaterialRow>();
  for (const m of mats ?? []) {
    const norm = normalizeMaterialRow(m);
    if (norm) byId.set(norm.id, norm);
  }

  for (const r of rows) {
    const pid = r.product_id ?? null;
    const mid = r.material_id ?? null;
    if (!pid || !mid) continue;
    const mat = byId.get(mid);
    if (!mat) continue;
    map[pid]?.push(mat);
  }

  return map;
}

async function setLinks({
  table,
  entityColumn,
  entityId,
  materialIds,
}: {
  table: "project_material_links" | "product_material_links";
  entityColumn: "project_id" | "product_id";
  entityId: string;
  materialIds: string[];
}): Promise<{ error: string | null }> {
  const sup = supabase();
  const ids = Array.from(new Set(materialIds.filter(Boolean)));

  const { data: existing, error: existingError } = await sup
    .from(table)
    .select("material_id")
    .eq(entityColumn, entityId);
  if (existingError) {
    return { error: existingError.message };
  }
  const existingIds = new Set(
    (existing ?? []).map((r) => (r as { material_id: string }).material_id)
  );

  const toDelete = Array.from(existingIds).filter((id) => !ids.includes(id));
  const toInsert = ids.filter((id) => !existingIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await sup
      .from(table)
      .delete()
      .eq(entityColumn, entityId)
      .in("material_id", toDelete);
    if (delErr) return { error: delErr.message };
  }

  if (toInsert.length > 0) {
    const rows = toInsert.map((material_id) => ({
      [entityColumn]: entityId,
      material_id,
    }));
    const { error: insErr } = await sup.from(table).insert(rows);
    if (insErr) return { error: insErr.message };
  }

  return { error: null };
}

export async function setProjectMaterials(
  projectId: string,
  materialIds: string[]
): Promise<{ error: string | null }> {
  return setLinks({
    table: "project_material_links",
    entityColumn: "project_id",
    entityId: projectId,
    materialIds,
  });
}

export async function setProductMaterials(
  productId: string,
  materialIds: string[]
): Promise<{ error: string | null }> {
  return setLinks({
    table: "product_material_links",
    entityColumn: "product_id",
    entityId: productId,
    materialIds,
  });
}
