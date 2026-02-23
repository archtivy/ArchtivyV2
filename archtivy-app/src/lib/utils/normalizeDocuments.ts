/**
 * Normalize raw documents from product.documents (jsonb), listing_documents, or legacy shapes.
 * Supports: array, { files: [...] }, single object.
 */

export type DocFile = { url: string; name?: string; mime?: string; size?: number };

const URL_KEYS = ["url", "fileUrl", "href", "downloadUrl", "path", "publicUrl", "file_url"];
const NAME_KEYS = ["name", "fileName", "originalName", "title", "file_name"];

function getStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function normalizeDocuments(raw: unknown): DocFile[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object" && "files" in raw && Array.isArray((raw as { files: unknown }).files)) {
    arr = (raw as { files: unknown[] }).files;
  } else if (raw && typeof raw === "object") {
    arr = [raw];
  }
  const result: DocFile[] = [];
  for (const x of arr) {
    if (x == null || typeof x !== "object") continue;
    const d = x as Record<string, unknown>;
    const url = getStr(d, URL_KEYS);
    const name = getStr(d, NAME_KEYS) ?? (url ? url.split("/").pop() ?? "File" : "File");
    if (!url?.trim()) continue;
    const mime = typeof d.mime === "string" ? d.mime : typeof d.file_type === "string" ? d.file_type : undefined;
    const size =
      typeof d.size === "number" ? d.size : typeof d.size_bytes === "number" ? d.size_bytes : undefined;
    result.push({ url: url.trim(), name: name ?? "File", mime, size });
  }
  return result;
}
