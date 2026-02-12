import Image from "next/image";
import type { GalleryImage } from "@/lib/db/gallery";

export interface GalleryGridProps {
  images: GalleryImage[];
  onImageClick?: (index: number) => void;
}

export function GalleryGrid({ images, onImageClick }: GalleryGridProps) {
  if (images.length === 0) return null;

  return (
    <ul
      className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4"
      role="list"
      aria-label="Gallery"
    >
      {images.map((img, index) => (
        <li key={img.id} className="overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => onImageClick?.(index)}
            className="relative block aspect-[4/3] w-full focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-zinc-500"
            aria-label={`View image ${index + 1}: ${img.alt}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized={img.src.startsWith("http")}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
