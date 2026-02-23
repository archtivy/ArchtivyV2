"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PhotoTagger, type PhotoTagRecord } from "./PhotoTagger";
import { TagEditorPanel, type LinkedProductDisplay } from "./TagEditorPanel";
import { createTag } from "@/app/actions/smartProductTagging";
import { removePhotoProductTagAction } from "@/app/actions/projectBrandsProducts";

export interface PhotoTagWithMeta extends PhotoTagRecord {
  product_title?: string;
  product_slug?: string;
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  category_text?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
}

export interface ImageTaggingItem {
  listingImageId: string;
  imageUrl: string;
  imageAlt: string;
  existingTags: PhotoTagWithMeta[];
}

export interface ImageProductTaggingBlockProps {
  show: boolean;
  listingId: string;
  images: ImageTaggingItem[];
  materialOptions?: { id: string; display_name: string }[];
}

export function ImageProductTaggingBlock({
  show,
  listingId,
  images,
  materialOptions = [],
}: ImageProductTaggingBlockProps) {
  const router = useRouter();
  const [selectedTag, setSelectedTag] = useState<{
    tagId: string;
    listingImageId: string;
    imageUrl: string;
    imageAlt: string;
    initial: {
      product_id: string | null;
      product_type_id: string | null;
      product_category_id: string | null;
      product_subcategory_id: string | null;
      category_text?: string | null;
      color_text: string | null;
      material_id: string | null;
      feature_text: string | null;
    };
    linkedProduct: LinkedProductDisplay | null;
  } | null>(null);

  const handleTagAdded = useCallback(
    (tag?: PhotoTagRecord, image?: ImageTaggingItem) => {
      if (tag && image) {
        const productId = tag.product_id?.trim() ? tag.product_id : null;
        setSelectedTag({
          tagId: tag.id,
          listingImageId: tag.listing_image_id,
          imageUrl: image.imageUrl,
          imageAlt: image.imageAlt,
          initial: {
            product_id: productId,
            product_type_id: null,
            product_category_id: null,
            product_subcategory_id: null,
            category_text: null,
            color_text: null,
            material_id: null,
            feature_text: null,
          },
          linkedProduct: productId
            ? { id: productId, title: "", slug: null, brand_name: undefined, cover_image_url: undefined }
            : null,
        });
      }
      router.refresh();
    },
    [router]
  );
  const handleRemove = useCallback(
    async (tagId: string) => {
      const res = await removePhotoProductTagAction(tagId);
      if (res.ok) {
        if (selectedTag?.tagId === tagId) setSelectedTag(null);
        router.refresh();
      }
    },
    [router, selectedTag?.tagId]
  );

  const handlePlaceTag = useCallback(
    async (listingImageId: string, imageUrl: string, imageAlt: string, normX: number, normY: number) => {
      const res = await createTag(listingImageId, listingId, normX, normY);
      if (!res.ok || !res.data) return;
      setSelectedTag({
        tagId: res.data.id,
        listingImageId,
        imageUrl,
        imageAlt,
        initial: {
          product_id: null,
          product_type_id: null,
          product_category_id: null,
          product_subcategory_id: null,
          color_text: null,
          material_id: null,
          feature_text: null,
        },
        linkedProduct: null,
      });
      router.refresh();
    },
    [listingId, router]
  );

  const handleTagClick = useCallback((tag: PhotoTagWithMeta, imageUrl: string, imageAlt: string) => {
    const productId = tag.product_id && tag.product_id.trim() ? tag.product_id : null;
    setSelectedTag({
      tagId: tag.id,
      listingImageId: tag.listing_image_id,
      imageUrl,
      imageAlt,
      initial: {
        product_id: productId,
        product_type_id: tag.product_type_id ?? null,
        product_category_id: tag.product_category_id ?? null,
        product_subcategory_id: tag.product_subcategory_id ?? null,
        category_text: tag.category_text ?? null,
        color_text: tag.color_text ?? null,
        material_id: tag.material_id ?? null,
        feature_text: tag.feature_text ?? null,
      },
      linkedProduct: productId
        ? {
            id: productId,
            title: tag.product_title ?? "",
            slug: tag.product_slug ?? null,
            brand_name: undefined,
            cover_image_url: undefined,
          }
        : null,
    });
  }, []);

  const handleEditorSaved = useCallback(
    (linkedProduct?: LinkedProductDisplay) => {
      if (linkedProduct) {
        setSelectedTag((prev) => (prev ? { ...prev, linkedProduct } : null));
      }
      router.refresh();
    },
    [router]
  );

  const handleEditorDeleted = useCallback(() => {
    router.refresh();
    setSelectedTag(null);
  }, [router]);

  if (!show) return null;
  if (images.length === 0) {
    return (
      <section
        className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-700"
        aria-label="Image product tagging (admin)"
      >
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Image Product Tagging
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add images first to enable tagging.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-700"
      aria-label="Image product tagging (admin)"
    >
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Image Product Tagging
      </h2>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Click the image to add a product tag (search popover), or click a hotspot to edit in the right panel.
      </p>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-8 overflow-visible">
          {images.map((img) => (
            <div key={img.listingImageId} className="space-y-3 overflow-visible">
              <PhotoTagger
                listingId={listingId}
                listingImageId={img.listingImageId}
                imageUrl={img.imageUrl}
                imageAlt={img.imageAlt}
                existingTags={img.existingTags}
                onPlaceTag={(normX, normY) => handlePlaceTag(img.listingImageId, img.imageUrl, img.imageAlt, normX, normY)}
                onTagAdded={(tag) => handleTagAdded(tag, img)}
                onTagClick={(tag) => handleTagClick(tag, img.imageUrl, img.imageAlt)}
                materialOptions={materialOptions}
              />
              {img.existingTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tagged:
                  </span>
                  {img.existingTags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    >
                      {(t.product_title ?? t.product_id) || "—"}
                      <button
                        type="button"
                        onClick={() => handleRemove(t.id)}
                        className="ml-0.5 rounded p-0.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                        aria-label={`Remove tag ${t.product_title ?? t.product_id ?? "tag"}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="w-full shrink-0 lg:w-96">
          <div className="sticky top-4 h-[min(80vh,600px)]">
            {selectedTag ? (
              <TagEditorPanel
                tagId={selectedTag.tagId}
                listingId={listingId}
                initial={selectedTag.initial}
                linkedProduct={selectedTag.linkedProduct}
                materialOptions={materialOptions}
                onClose={() => setSelectedTag(null)}
                onSaved={handleEditorSaved}
                onDeleted={handleEditorDeleted}
              />
            ) : (
              <div className="flex h-[min(80vh,400px)] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a hotspot to edit.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
