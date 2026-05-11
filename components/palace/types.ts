import type { PalaceStop } from "@/lib/palace-schema";

export type ImageStatus = "pending" | "ready" | "failed" | "skipped";

export type ImageRecord = {
  locationId: string;
  step: number;
  status: ImageStatus;
  imageDataUrl: string | null;
  error: string | null;
  updatedAt: string;
};

export function findImage(
  images: ImageRecord[],
  locationId: string,
): ImageRecord | undefined {
  return images.find((image) => image.locationId === locationId);
}

export function imageForStop(images: ImageRecord[], stop: PalaceStop) {
  return findImage(images, stop.locationId);
}
