"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import type { ImageRecord } from "./types";

type SceneImageProps = {
  alt: string;
  image?: ImageRecord;
  className?: string;
};

export function SceneImage({ alt, image, className }: SceneImageProps) {
  const src = image?.status === "ready" ? image.imageDataUrl ?? undefined : undefined;
  const status = image?.status ?? "pending";

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden border border-border bg-surface",
        className,
      )}
    >
      {src ? (
        <Image
          alt={alt}
          src={src}
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtle">
            {status === "failed"
              ? "Image failed"
              : status === "skipped"
              ? "Image skipped"
              : "Rendering"}
          </p>
        </div>
      )}
    </div>
  );
}
