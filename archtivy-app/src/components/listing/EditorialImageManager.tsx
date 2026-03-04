"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  uploadListingImages,
  deleteListingImage,
  reorderListingImages,
  setPrimaryListingImage,
  updateImageAltForListing,
} from "@/app/(admin)/admin/_actions/media";
import { updateTag, deleteTag, getSuggestedProductsForWorkstation } from "@/app/actions/smartProductTagging";
import type { WorkstationSuggestedProduct } from "@/app/actions/smartProductTagging";
import { addPhotoProductTagAction } from "@/app/actions/projectBrandsProducts";
import { COLOR_OPTIONS, getColorSwatch } from "@/lib/colors";
import {
  PRODUCT_TAXONOMY,
  getCategoriesForType,
  getSubcategoriesForCategory,
} from "@/lib/taxonomy/productTaxonomy";
import { UploadBox } from "@/components/add/UploadBox";

const ACCENT = "#002abf";
const PULSE_THRESHOLD = 0.08;
const PULSE_DURATION_MS = 1200;

// ─── Upload validation constants ────────────────────────────────────────────
const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 3 * 1024 * 1024; // compress if > 3MB
const MAX_IMAGE_DIMENSION = 2400;
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const BATCH_SIZE = 5; // max files per server action call

/** Client-side compress via canvas. Skips GIFs (animated). Returns original on failure. */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  if (file.size <= COMPRESS_THRESHOLD_BYTES) return file;
  return new Promise<File>((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          const ext = "webp";
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], name, { type: "image/webp" }));
        },
        "image/webp",
        0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

/** Validate files client-side. Returns accepted files and error messages for rejected ones. */
function validateFiles(files: File[]): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.type === "image/heic" || f.type === "image/heif") {
      errors.push(`"${f.name}" is HEIC format — please convert to JPEG or WebP first.`);
      continue;
    }
    if (!ALLOWED_UPLOAD_TYPES.has(f.type)) {
      errors.push(`"${f.name}" has unsupported type (${f.type || "unknown"}). Use JPEG, PNG, WebP or GIF.`);
      continue;
    }
    if (f.size > MAX_FILE_BYTES) {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
      errors.push(`"${f.name}" is ${sizeMb}MB — max ${MAX_FILE_MB}MB. Please resize or compress it.`);
      continue;
    }
    if (f.size === 0) continue;
    accepted.push(f);
  }
  return { accepted, errors };
}

/** Safely call a server action, catching network/413 errors. */
async function safeServerAction<T extends { ok: boolean; error?: string }>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    if (msg.includes("413") || msg.includes("too large") || msg.includes("Body exceeded")) {
      return { ok: false, error: "Upload too large. Try fewer or smaller images." } as T;
    }
    return { ok: false, error: msg } as T;
  }
}

export interface EditorialImage {
  listingImageId: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  existingTags: EditorialProductTag[];
}

export interface EditorialProductTag {
  id: string;
  listing_image_id: string;
  product_id: string | null;
  x: number;
  y: number;
  product_title?: string | null;
  product_slug?: string | null;
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
}

export interface EditorialImageManagerProps {
  listingId: string;
  images: EditorialImage[];
  materialOptions: { id: string; display_name: string }[];
}

function findNearestTag(
  tags: EditorialProductTag[],
  x: number,
  y: number
): { tag: EditorialProductTag; distance: number } | null {
  if (tags.length === 0) return null;
  let nearest: EditorialProductTag | null = null;
  let minDist = Infinity;
  for (const tag of tags) {
    const dx = x - tag.x;
    const dy = y - tag.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < minDist) {
      minDist = d;
      nearest = tag;
    }
  }
  return nearest && minDist <= PULSE_THRESHOLD ? { tag: nearest, distance: minDist } : null;
}

export function EditorialImageManager({
  listingId,
  images,
  materialOptions,
}: EditorialImageManagerProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(images.length > 0 ? 0 : null);
  const [altDraft, setAltDraft] = useState("");
  const [imageTitleDraft, setImageTitleDraft] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [lastClickXY, setLastClickXY] = useState<{ x: number; y: number } | null>(null);
  const [highlightedTagId, setHighlightedTagId] = useState<string | null>(null);
  const [pulseTag, setPulseTag] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tagSaveStatus, setTagSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const tagSaveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Gallery management transitions
  const [uploadPending, startUploadTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();
  const [reorderPending, startReorderTransition] = useTransition();
  const [primaryPending, startPrimaryTransition] = useTransition();

  const selectedImage = selectedIndex !== null && selectedIndex < images.length ? images[selectedIndex] : null;

  const [selectedTagIdForEdit, setSelectedTagIdForEdit] = useState<string | null>(null);
  const [optimisticTagsByImageId, setOptimisticTagsByImageId] = useState<Record<string, EditorialProductTag[]>>({});

  const tagsForSelectedImage = useMemo(() => {
    if (!selectedImage) return [];
    const existingIds = new Set(selectedImage.existingTags.map((t) => t.id));
    const optimistic = optimisticTagsByImageId[selectedImage.listingImageId] ?? [];
    const extra = optimistic.filter((t) => !existingIds.has(t.id));
    return [...selectedImage.existingTags, ...extra];
  }, [selectedImage, optimisticTagsByImageId]);

  useEffect(() => {
    if (selectedImage) {
      setAltDraft(selectedImage.imageAlt ?? "");
      setImageTitleDraft("");
      setCaptionDraft("");
      setSaveError(null);
      setHighlightedTagId(null);
      setPulseTag(null);
      setSelectedTagIdForEdit(null);
    }
  }, [selectedImage?.listingImageId]);

  const handleTagAdded = useCallback((tag: EditorialProductTag) => {
    setOptimisticTagsByImageId((prev) => ({
      ...prev,
      [tag.listing_image_id]: [...(prev[tag.listing_image_id] ?? []), tag],
    }));
  }, []);

  const existingTagIds = selectedImage?.existingTags.map((t) => t.id).sort().join(",") ?? "";
  useEffect(() => {
    if (!selectedImage) return;
    const existingIds = new Set(selectedImage.existingTags.map((t) => t.id));
    setOptimisticTagsByImageId((prev) => {
      const list = prev[selectedImage.listingImageId] ?? [];
      const kept = list.filter((t) => !existingIds.has(t.id));
      if (kept.length === 0 && list.length > 0) {
        const next = { ...prev };
        delete next[selectedImage.listingImageId];
        return next;
      }
      if (kept.length === list.length) return prev;
      return { ...prev, [selectedImage.listingImageId]: kept };
    });
  }, [selectedImage?.listingImageId, existingTagIds]);

  // ─── Gallery error (auto-dismiss after 8s) ─────────────────────────────────
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const galleryErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showGalleryError = useCallback((msg: string) => {
    setGalleryError(msg);
    if (galleryErrorTimerRef.current) clearTimeout(galleryErrorTimerRef.current);
    galleryErrorTimerRef.current = setTimeout(() => setGalleryError(null), 8000);
  }, []);

  // ─── Gallery management handlers ──────────────────────────────────────────

  const handleUploadFiles = useCallback(
    (files: File[]) => {
      // 1. Client-side validation
      const { accepted, errors } = validateFiles(files);
      if (errors.length > 0) {
        showGalleryError(errors.join("\n"));
      }
      if (accepted.length === 0) return;

      startUploadTransition(async () => {
        // 2. Compress large files client-side
        const prepared = await Promise.all(accepted.map(compressImage));

        // 3. Upload in batches to avoid 413 on large payloads
        const batches: File[][] = [];
        for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
          batches.push(prepared.slice(i, i + BATCH_SIZE));
        }

        const batchErrors: string[] = [];
        for (const batch of batches) {
          const fd = new FormData();
          fd.set("listingId", listingId);
          for (const f of batch) fd.append("files", f);
          const res = await safeServerAction(() => uploadListingImages(fd));
          if (!res.ok) {
            batchErrors.push(res.error ?? "Upload failed");
          }
        }

        if (batchErrors.length > 0) {
          showGalleryError(batchErrors.join("\n"));
        }
        router.refresh();
      });
    },
    [listingId, router, showGalleryError]
  );

  const handleDeleteImage = useCallback(
    (imageId: string) => {
      if (!confirm("Delete this image? This cannot be undone.")) return;
      startDeleteTransition(async () => {
        const res = await safeServerAction(() => deleteListingImage(imageId, listingId));
        if (!res.ok) {
          showGalleryError(res.error ?? "Delete failed");
        } else {
          if (selectedIndex !== null) {
            const delIdx = images.findIndex((img) => img.listingImageId === imageId);
            if (delIdx !== -1 && delIdx <= selectedIndex) {
              setSelectedIndex(Math.max(0, selectedIndex - 1));
            }
          }
        }
        router.refresh();
      });
    },
    [listingId, selectedIndex, images, router, showGalleryError]
  );

  const handleMoveImage = useCallback(
    (direction: "left" | "right") => {
      if (selectedIndex === null) return;
      const newIdx = direction === "left" ? selectedIndex - 1 : selectedIndex + 1;
      if (newIdx < 0 || newIdx >= images.length) return;
      const ids = images.map((img) => img.listingImageId);
      [ids[selectedIndex], ids[newIdx]] = [ids[newIdx], ids[selectedIndex]];
      startReorderTransition(async () => {
        const res = await safeServerAction(() => reorderListingImages(listingId, ids));
        if (!res.ok) showGalleryError(res.error ?? "Reorder failed");
        setSelectedIndex(newIdx);
        router.refresh();
      });
    },
    [selectedIndex, images, listingId, router, showGalleryError]
  );

  const handleSetPrimary = useCallback(() => {
    if (selectedIndex === null || selectedIndex === 0) return;
    const imageId = images[selectedIndex].listingImageId;
    startPrimaryTransition(async () => {
      const res = await safeServerAction(() => setPrimaryListingImage(listingId, imageId));
      if (!res.ok) showGalleryError(res.error ?? "Set primary failed");
      setSelectedIndex(0);
      router.refresh();
    });
  }, [selectedIndex, images, listingId, router, showGalleryError]);

  // ─── Save alt text ────────────────────────────────────────────────────────

  const handleSaveChanges = useCallback(async () => {
    if (!selectedImage) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateImageAltForListing({
        imageId: selectedImage.listingImageId,
        alt: altDraft.trim() || null,
        listingId,
      });
      if (!res.ok) setSaveError(res.error ?? "Failed to save");
      else router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [selectedImage, altDraft, listingId, router]);

  const handleSaveAndContinue = useCallback(async () => {
    await handleSaveChanges();
    if (selectedIndex === null || images.length <= 1) return;
    const next = (selectedIndex + 1) % images.length;
    setSelectedIndex(next);
  }, [handleSaveChanges, selectedIndex, images.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveChanges();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveChanges]);

  const handleBigImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedImage || !imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      const clampedX = Math.max(0, Math.min(1, relX));
      const clampedY = Math.max(0, Math.min(1, relY));
      setLastClickXY({ x: clampedX, y: clampedY });
      const nearest = findNearestTag(tagsForSelectedImage, clampedX, clampedY);
      if (nearest) {
        setPulseTag({ x: nearest.tag.x, y: nearest.tag.y });
        setHighlightedTagId(nearest.tag.id);
        setSelectedTagIdForEdit(nearest.tag.id);
        setTimeout(() => setPulseTag(null), PULSE_DURATION_MS);
        setTimeout(() => setHighlightedTagId(null), PULSE_DURATION_MS + 200);
      }
    },
    [selectedImage, tagsForSelectedImage]
  );

  const anyPending = uploadPending || deletePending || reorderPending || primaryPending;

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (images.length === 0) {
    return (
      <section className="border-t border-zinc-100 pt-16">
        <header className="text-center mb-8">
          <h2
            className="text-[2rem] font-normal tracking-tight text-zinc-900 mb-1"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            ARCHTIVY
          </h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Editorial Image Manager</p>
        </header>
        <div className="max-w-md mx-auto">
          <UploadBox
            id="gallery-upload-empty"
            accept="image/jpeg,image/png,image/webp,image/gif"
            primaryText="Add images to get started"
            hintText={`Minimum 3 for publishing · JPEG, PNG, WebP or GIF · max ${MAX_FILE_MB}MB each`}
            onFilesSelected={handleUploadFiles}
            disabled={uploadPending}
          />
          {uploadPending && (
            <p className="text-center text-sm text-zinc-500 mt-3">Uploading...</p>
          )}
          {galleryError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
              {galleryError}
            </div>
          )}
        </div>
      </section>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <section className="border-t border-zinc-100 pt-16 pb-24">
      <style>{`@keyframes pulseRing { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.4); opacity: 0; } }`}</style>
      <header className="text-center mb-12">
        <h2
          className="text-[2rem] font-normal tracking-tight text-zinc-900 mb-1"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          ARCHTIVY
        </h2>
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Editorial Image Manager</p>
      </header>

      {selectedIndex !== null && selectedImage && (
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
          {/* LEFT: big image + upload + thumb strip */}
          <div className="flex-1 min-w-0">
            <div
              className="relative rounded-[10px] overflow-hidden bg-zinc-100 shadow-md"
              style={{ maxHeight: 520 }}
            >
              <div
                ref={imageContainerRef}
                role="button"
                tabIndex={0}
                onClick={handleBigImageClick}
                onKeyDown={(e) => e.key === "Enter" && (imageContainerRef.current as HTMLElement)?.click()}
                className="relative w-full aspect-[4/3] max-h-[520px] cursor-crosshair"
              >
                <Image
                  src={images[selectedIndex].imageUrl}
                  alt={altDraft || images[selectedIndex].imageAlt || "Selected image"}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  unoptimized={images[selectedIndex].imageUrl.startsWith("http")}
                  priority
                />
                {pulseTag && (
                  <div
                    className="absolute pointer-events-none rounded-full border-2 border-[#002abf] animate-[pulseRing_1.2s_ease-out_forwards]"
                    style={{
                      left: `${pulseTag.x * 100}%`,
                      top: `${pulseTag.y * 100}%`,
                      width: 48,
                      height: 48,
                      marginLeft: -24,
                      marginTop: -24,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Upload zone (compact) */}
            <div className="mt-4">
              <UploadBox
                id="gallery-upload-add"
                accept="image/jpeg,image/png,image/webp,image/gif"
                primaryText={uploadPending ? "Uploading..." : "Add more images"}
                hintText={`JPEG, PNG, WebP or GIF · max ${MAX_FILE_MB}MB each · large images auto-compressed`}
                onFilesSelected={handleUploadFiles}
                disabled={uploadPending}
              />
              {galleryError && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
                  {galleryError}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ minHeight: 80 }}>
              {images.map((img, idx) => (
                <div key={img.listingImageId} className="group relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative w-20 h-[80px] rounded overflow-hidden bg-zinc-100 flex items-center justify-center focus:outline-none ${
                      selectedIndex === idx ? "ring-1 ring-[#002abf]" : ""
                    }`}
                  >
                    <Image
                      src={img.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized={img.imageUrl.startsWith("http")}
                    />
                    {idx === 0 && (
                      <span
                        className="absolute top-0.5 left-0.5 px-1.5 py-0.5 text-[9px] font-medium uppercase text-white rounded"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Primary
                      </span>
                    )}
                  </button>
                  {/* Delete overlay */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.listingImageId)}
                    disabled={deletePending}
                    className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs hover:bg-red-600 shadow-sm"
                    aria-label="Delete image"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: sticky panel */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="lg:sticky lg:top-4 space-y-6">
              {/* Gallery controls */}
              <div className="rounded-lg border border-zinc-100 bg-white p-4">
                <h3
                  className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2 mb-3"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  Gallery
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleMoveImage("left")}
                    disabled={selectedIndex === 0 || reorderPending}
                    className="flex-1 px-3 py-2 text-sm font-medium border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {reorderPending ? "..." : "Move left"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveImage("right")}
                    disabled={selectedIndex === images.length - 1 || reorderPending}
                    className="flex-1 px-3 py-2 text-sm font-medium border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {reorderPending ? "..." : "Move right"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetPrimary}
                    disabled={selectedIndex === 0 || primaryPending}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {primaryPending ? "..." : "Set as cover"}
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedImage && handleDeleteImage(selectedImage.listingImageId)}
                    disabled={deletePending}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletePending ? "..." : "Delete image"}
                  </button>
                </div>
                <p className={`mt-3 text-xs ${images.length < 3 ? "text-amber-600" : "text-zinc-500"}`}>
                  {images.length} image{images.length !== 1 ? "s" : ""}{images.length < 3 ? " — minimum 3 for publishing" : ""}
                </p>
              </div>

              {/* SEO */}
              <div className="rounded-lg border border-zinc-100 bg-white p-4">
                <h3
                  className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2 mb-3"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  SEO
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      Alt text <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={altDraft}
                      onChange={(e) => setAltDraft(e.target.value)}
                      placeholder="Describe the image for accessibility"
                      rows={2}
                      className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none min-h-[60px]"
                    />
                  </div>
                  <div className="border-t border-zinc-100 pt-3">
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Image title</label>
                    <input
                      type="text"
                      value={imageTitleDraft}
                      onChange={(e) => setImageTitleDraft(e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div className="border-t border-zinc-100 pt-3">
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Caption</label>
                    <input
                      type="text"
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <p className="text-xs text-zinc-500">
                {tagSaveStatus === "saving" && "Saving\u2026"}
                {tagSaveStatus === "saved" && "Saved"}
                {tagSaveStatus === "idle" && saveError && <span className="text-red-600">{saveError}</span>}
              </p>

              {/* Tagging workflow */}
              <TaggingWorkstation
                listingId={listingId}
                selectedImage={selectedImage}
                tagsForSelectedImage={tagsForSelectedImage}
                onTagAdded={handleTagAdded}
                materialOptions={materialOptions}
                lastClickXY={lastClickXY}
                highlightedTagId={highlightedTagId}
                selectedTagIdForEdit={selectedTagIdForEdit}
                onSelectedTagIdForEditChange={setSelectedTagIdForEdit}
                onTagSaveStatus={setTagSaveStatus}
                onTagsChange={() => router.refresh()}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {selectedImage && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-zinc-100 py-4 px-6 z-50" style={{ backdropFilter: "saturate(180%) blur(8px)" }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-sm text-zinc-500">
              Image {(selectedIndex ?? 0) + 1} of {images.length}
            </span>
            <div className="flex items-center gap-3">
              {saveError && <span className="text-sm text-red-600">{saveError}</span>}
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving || anyPending}
                className="px-5 py-2.5 text-sm font-medium text-white rounded opacity-100 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {saving ? "Saving\u2026" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving || anyPending}
                className="px-5 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded hover:bg-zinc-50 disabled:opacity-60"
              >
                Save & continue
              </button>
            </div>
          </div>
        </footer>
      )}
    </section>
  );
}

interface TaggingWorkstationProps {
  listingId: string;
  selectedImage: EditorialImage | null;
  tagsForSelectedImage: EditorialProductTag[];
  onTagAdded: (tag: EditorialProductTag) => void;
  materialOptions: { id: string; display_name: string }[];
  lastClickXY: { x: number; y: number } | null;
  highlightedTagId: string | null;
  selectedTagIdForEdit: string | null;
  onSelectedTagIdForEditChange: (id: string | null) => void;
  onTagSaveStatus: (s: "idle" | "saving" | "saved") => void;
  onTagsChange: () => void;
}

function TaggingWorkstation({
  listingId,
  selectedImage,
  tagsForSelectedImage,
  onTagAdded,
  materialOptions,
  lastClickXY,
  highlightedTagId,
  selectedTagIdForEdit,
  onSelectedTagIdForEditChange,
  onTagSaveStatus,
  onTagsChange,
}: TaggingWorkstationProps) {
  const [typeId, setTypeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ bestMatch: WorkstationSuggestedProduct[]; allResults: WorkstationSuggestedProduct[] }>({ bestMatch: [], allResults: [] });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<WorkstationSuggestedProduct | null>(null);
  const [tagFeatureDraft, setTagFeatureDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const tagSaveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addAnotherButtonRef = useRef<HTMLButtonElement>(null);
  const suggestionsListRef = useRef<HTMLDivElement>(null);

  const categoryOptions = getCategoriesForType(typeId);
  const subcategoryOptions = getSubcategoriesForCategory(typeId, categoryId);

  useEffect(() => {
    if (!selectedImage) return;
    setSuggestionsLoading(true);
    getSuggestedProductsForWorkstation({
      typeId: typeId || null,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      materialId: materialId || null,
      colorOptions: selectedColors.length > 0 ? selectedColors : undefined,
      searchQuery: searchQuery.trim() || null,
    })
      .then((res) => {
        setSuggestionsLoading(false);
        if (res.ok && res.data) setSuggestions(res.data);
        else setSuggestions({ bestMatch: [], allResults: [] });
      })
      .catch(() => {
        setSuggestionsLoading(false);
        setSuggestions({ bestMatch: [], allResults: [] });
      });
  }, [selectedImage?.listingImageId, typeId, categoryId, subcategoryId, materialId, selectedColors, searchQuery]);

  const toggleColor = (c: string) => {
    setSelectedColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const [addTagError, setAddTagError] = useState<string | null>(null);

  const handleAddTag = useCallback(async () => {
    if (!selectedImage || !selectedCandidate) return;
    const x = lastClickXY?.x ?? 0.5;
    const y = lastClickXY?.y ?? 0.5;
    const listingImageId = selectedImage.listingImageId;
    const productListingId = selectedCandidate.listing_id ?? selectedCandidate.id;
    setAddTagError(null);
    setAddingTag(true);
    onTagSaveStatus("saving");
    let res: { data: { id: string } | null; error: string | null };
    try {
      res = await addPhotoProductTagAction(listingImageId, listingId, productListingId, x, y);
    } catch (err) {
      setAddingTag(false);
      onTagSaveStatus("idle");
      const msg = err instanceof Error ? err.message : "Add tag failed";
      setAddTagError(msg);
      return;
    }
    setAddingTag(false);
    if (res.error) {
      onTagSaveStatus("idle");
      setAddTagError(res.error || "Add tag failed");
      return;
    }
    if (!res.data) {
      onTagSaveStatus("idle");
      setAddTagError("No tag returned from server");
      return;
    }
    onTagSaveStatus("saved");
    if (tagSaveStatusTimeoutRef.current) clearTimeout(tagSaveStatusTimeoutRef.current);
    tagSaveStatusTimeoutRef.current = setTimeout(() => onTagSaveStatus("idle"), 2000);

    const createdTag: EditorialProductTag = {
      id: res.data.id,
      listing_image_id: listingImageId,
      product_id: productListingId,
      x,
      y,
      product_title: selectedCandidate.title ?? null,
      product_slug: selectedCandidate.slug ?? null,
      product_type_id: selectedCandidate.product_type ?? null,
      product_category_id: selectedCandidate.product_category ?? null,
      product_subcategory_id: selectedCandidate.product_subcategory ?? null,
      color_text: null,
      material_id: null,
      feature_text: tagFeatureDraft.trim() || null,
    };
    onTagAdded(createdTag);
    onSelectedTagIdForEditChange(createdTag.id);
    setSelectedCandidate(null);
    setTagFeatureDraft("");
    setTimeout(() => onTagsChange(), 300);
    requestAnimationFrame(() => addAnotherButtonRef.current?.focus());
  }, [selectedImage, selectedCandidate, lastClickXY, listingId, tagFeatureDraft, onTagSaveStatus, onTagsChange, onTagAdded, onSelectedTagIdForEditChange]);

  if (!selectedImage) return null;

  return (
    <div className="space-y-6 rounded-lg border border-zinc-100 bg-white p-4">
      <h3
        className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        Tagging
      </h3>

      {/* Filters: same hierarchy as product submission */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Type <span className="text-red-500">*</span></label>
          <select
            value={typeId}
            onChange={(e) => {
              const v = e.target.value;
              setTypeId(v);
              setCategoryId("");
              setSubcategoryId("");
            }}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">Select</option>
            {PRODUCT_TAXONOMY.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId("");
            }}
            disabled={!typeId}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-60"
          >
            <option value="">Select</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Subcategory</label>
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            disabled={!categoryId}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-60"
          >
            <option value="">Select</option>
            {subcategoryOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Material</label>
          <select
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">Select</option>
            {materialOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Color options</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColor(c)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs focus:outline-none ${
                  selectedColors.includes(c) ? "border-[#002abf] bg-[#002abf]/10" : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                }`}
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getColorSwatch(c) }} />
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Product or brand"
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Suggested: Best match + All results */}
      <div className="space-y-3" ref={suggestionsListRef} tabIndex={-1} aria-label="Suggested products list">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Suggested products</h4>
        {suggestionsLoading && <p className="text-sm text-zinc-500">Loading\u2026</p>}
        {!suggestionsLoading && (
          <>
            {suggestions.bestMatch.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Best match</p>
                <div className="space-y-1.5 max-h-48 overflow-auto">
                  {suggestions.bestMatch.map((p) => (
                    <SuggestedProductCard
                      key={p.id}
                      product={p}
                      isSelected={selectedCandidate?.id === p.id}
                      onSelect={() => setSelectedCandidate(p)}
                    />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 mb-2">All results</p>
              <div className="space-y-1.5 max-h-56 overflow-auto">
                {suggestions.allResults.map((p) => (
                  <SuggestedProductCard
                    key={p.id}
                    product={p}
                    isSelected={selectedCandidate?.id === p.id}
                    onSelect={() => setSelectedCandidate(p)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tag details confirm */}
      {selectedCandidate && (
        <div className="rounded-lg border border-[#002abf]/30 bg-[#002abf]/5 p-3">
          <p className="text-xs font-medium text-zinc-700 mb-2">Tag details</p>
          {addTagError && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {addTagError}
            </p>
          )}
          <input
            type="text"
            value={tagFeatureDraft}
            onChange={(e) => setTagFeatureDraft(e.target.value)}
            placeholder="Distinct feature (optional)"
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm mb-3 focus:border-zinc-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddTag}
              disabled={addingTag}
              className="px-3 py-2 text-sm font-medium text-white rounded opacity-100 disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {addingTag ? "Adding\u2026" : "Add tag"}
            </button>
            <button
              type="button"
              onClick={() => { setSelectedCandidate(null); setTagFeatureDraft(""); setAddTagError(null); }}
              className="px-3 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 rounded hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add another product: focus target after adding a tag */}
      {tagsForSelectedImage.length > 0 && (
        <div>
          <button
            ref={addAnotherButtonRef}
            type="button"
            onClick={() => {
              onSelectedTagIdForEditChange(null);
              suggestionsListRef.current?.focus();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-zinc-600 border border-dashed border-zinc-300 rounded-lg hover:bg-zinc-50 hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#002abf]/30 focus:border-[#002abf]"
          >
            <span aria-hidden>+</span>
            Add another product
          </button>
        </div>
      )}

      {/* Existing tags: compact dropdown + single edit panel */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tagged products</h4>
        {tagsForSelectedImage.length === 0 ? (
          <p className="text-sm text-zinc-500">No tags yet. Select Type/Category and a suggestion, then Add tag.</p>
        ) : (
          <>
            <select
              value={selectedTagIdForEdit ?? ""}
              onChange={(e) => onSelectedTagIdForEditChange(e.target.value ? e.target.value : null)}
              className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              aria-label={`Tagged products (${tagsForSelectedImage.length})`}
            >
              <option value="">Tagged products ({tagsForSelectedImage.length})</option>
              {tagsForSelectedImage.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.product_title ?? "Untitled product"}
                </option>
              ))}
            </select>
            {selectedTagIdForEdit && (() => {
              const tag = tagsForSelectedImage.find((t) => t.id === selectedTagIdForEdit);
              if (!tag) return null;
              return (
                <div className="mt-3">
                  <ExistingTagEditPanel
                    tag={tag}
                    listingId={listingId}
                    materialOptions={materialOptions}
                    isHighlighted={highlightedTagId === tag.id}
                    onUpdate={onTagsChange}
                    onSaveStatus={onTagSaveStatus}
                    onRemove={() => onSelectedTagIdForEditChange(null)}
                  />
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function SuggestedProductCard({
  product,
  isSelected,
  onSelect,
}: {
  product: WorkstationSuggestedProduct;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-lg border p-2 text-left transition focus:outline-none ${
        isSelected ? "border-[#002abf] bg-[#002abf]/5" : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-100">
        {product.cover_image_url ? (
          <Image src={product.cover_image_url} alt="" fill className="object-cover" sizes="48px" unoptimized={product.cover_image_url.startsWith("http")} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">&mdash;</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">{product.title ?? "Untitled"}</p>
        {product.brand_name && <p className="truncate text-xs text-zinc-500">by {product.brand_name}</p>}
        {(product.product_type || product.product_category || product.product_subcategory) && (
          <p className="truncate text-xs text-zinc-400">
            {[product.product_type, product.product_category, product.product_subcategory].filter(Boolean).join(" / ")}
          </p>
        )}
        {product.color_options && product.color_options.length > 0 && (
          <div className="flex gap-1 mt-1">
            {product.color_options.slice(0, 5).map((c) => (
              <span key={c} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getColorSwatch(c) }} title={c} />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function ExistingTagEditPanel({
  tag,
  listingId,
  materialOptions,
  isHighlighted,
  onUpdate,
  onSaveStatus,
  onRemove,
}: {
  tag: EditorialProductTag;
  listingId: string;
  materialOptions: { id: string; display_name: string }[];
  isHighlighted: boolean;
  onUpdate: () => void;
  onSaveStatus: (s: "idle" | "saving" | "saved") => void;
  onRemove: () => void;
}) {
  const [featureText, setFeatureText] = useState(tag.feature_text ?? "");
  const [materialId, setMaterialId] = useState(tag.material_id ?? "");
  const [colorText, setColorText] = useState(tag.color_text ?? "");
  const [removing, setRemoving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistUpdate = useCallback(
    (patch: { feature_text?: string | null; material_id?: string | null; color_text?: string | null }) => {
      onSaveStatus("saving");
      updateTag(tag.id, listingId, {
        product_id: tag.product_id,
        ...patch,
      }).then((res) => {
        if (res.ok) {
          onUpdate();
          onSaveStatus("saved");
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => onSaveStatus("idle"), 2000);
        } else onSaveStatus("idle");
      });
    },
    [tag.id, tag.product_id, listingId, onUpdate, onSaveStatus]
  );

  const handleFeatureBlur = () => {
    if (featureText.trim() !== (tag.feature_text ?? "")) persistUpdate({ feature_text: featureText.trim() || null });
  };
  const handleMaterialChange = (v: string) => {
    setMaterialId(v);
    persistUpdate({ material_id: v || null });
  };
  const handleColorChange = (v: string) => {
    setColorText(v);
    persistUpdate({ color_text: v || null });
  };

  const handleRemove = useCallback(async () => {
    setRemoving(true);
    const res = await deleteTag(tag.id);
    setRemoving(false);
    if (res.ok) {
      onUpdate();
      onRemove();
    }
  }, [tag.id, onUpdate, onRemove]);

  const materialLabel = materialOptions.find((m) => m.id === tag.material_id)?.display_name ?? "";

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        isHighlighted ? "border-[#002abf] bg-[#002abf]/5" : "border-zinc-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900 truncate">{tag.product_title ?? "\u2014"}</p>
          <p className="text-xs text-zinc-500 truncate">{materialLabel || tag.color_text || "\u2014"}</p>
          <div className="mt-2 space-y-1.5">
            <input
              type="text"
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              onBlur={handleFeatureBlur}
              placeholder="Distinct feature"
              className="w-full border border-zinc-200 rounded px-2 py-1.5 text-xs focus:border-zinc-400 focus:outline-none"
            />
            <div className="flex gap-2 flex-wrap">
              <select
                value={materialId}
                onChange={(e) => handleMaterialChange(e.target.value)}
                className="border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="">Material</option>
                {materialOptions.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
              <select
                value={colorText}
                onChange={(e) => handleColorChange(e.target.value)}
                className="border border-zinc-200 rounded px-2 py-1 text-xs focus:outline-none"
              >
                <option value="">Color</option>
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button type="button" onClick={handleRemove} disabled={removing} className="text-xs text-zinc-400 hover:text-red-600 shrink-0">
          {removing ? "\u2026" : "Remove"}
        </button>
      </div>
    </div>
  );
}
