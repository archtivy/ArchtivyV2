import Image from "next/image";
import type { ListingImage } from "@/lib/db/listingImages";

interface GalleryGridProps {
  images: ListingImage[];
  /** Optional alt prefix for listing context when alt is null */
  altPrefix?: string;
}

export function GalleryGrid({ images, altPrefix = "Gallery" }: GalleryGridProps) {
  if (images.length === 0) return null;

  return (
    <section
      className="space-y-3"
      aria-labelledby="gallery-heading"
    >
      <h2
        id="gallery-heading"
        className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
      >
        Gallery
      </h2>
      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4"
        role="list"
      >
        {images.map((img) => (
          <li key={img.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <a
              href={img.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square w-full focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-950"
            >
              <Image
                src={img.image_url}
                alt={img.alt ?? `${altPrefix} image ${img.sort_order + 1}`}
                width={400}
                height={400}
                className="h-full w-full object-cover"
                sizes="(max-width: 640px) 50vw, 33vw"
                unoptimized
              />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
