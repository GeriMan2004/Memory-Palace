import type { PalaceImageStatus, PalaceStop } from "@/lib/palace-schema";

type PalaceSceneRecord = PalaceStop & {
  attempts: number;
  error: string | null;
  imageDataUrl: string | null;
  imagePrompt: string;
  status: PalaceImageStatus;
  updatedAt: string;
};

export type PalaceImageBatch = {
  createdAt: string;
  images: PalaceSceneRecord[];
  isProcessing: boolean;
  requestId: string;
  updatedAt: string;
};

type BatchStore = Map<string, PalaceImageBatch>;

declare global {
  var __memoryPalaceBatches__: BatchStore | undefined;
}

function getStore() {
  if (!globalThis.__memoryPalaceBatches__) {
    globalThis.__memoryPalaceBatches__ = new Map<string, PalaceImageBatch>();
  }

  return globalThis.__memoryPalaceBatches__;
}

function createRecord(
  stop: PalaceStop,
  imagePrompt: string,
  status: PalaceImageStatus = "pending",
) {
  const timestamp = new Date().toISOString();

  return {
    ...stop,
    attempts: 0,
    error: null,
    imageDataUrl: null,
    imagePrompt,
    status,
    updatedAt: timestamp,
  } satisfies PalaceSceneRecord;
}

export function upsertImageBatch({
  imagePrompts,
  requestId,
  retryFailed,
  scenes,
}: {
  imagePrompts: Record<string, string>;
  requestId: string;
  retryFailed: boolean;
  scenes: PalaceStop[];
}) {
  const store = getStore();
  const existing = store.get(requestId);
  const now = new Date().toISOString();

  if (!existing || !retryFailed) {
    const nextBatch: PalaceImageBatch = {
      createdAt: existing?.createdAt ?? now,
      images: scenes.map((scene) =>
        createRecord(scene, imagePrompts[scene.locationId] ?? ""),
      ),
      isProcessing: false,
      requestId,
      updatedAt: now,
    };

    store.set(requestId, nextBatch);
    return nextBatch;
  }

  const images = existing.images.map((scene) => {
    const incoming = scenes.find(
      (candidate) => candidate.locationId === scene.locationId,
    );

    if (!incoming) {
      return scene;
    }

    if (scene.status !== "failed") {
      return {
        ...scene,
        ...incoming,
        imagePrompt: imagePrompts[incoming.locationId] ?? scene.imagePrompt,
        updatedAt: now,
      };
    }

    return {
      ...scene,
      ...incoming,
      error: null,
      imagePrompt: imagePrompts[incoming.locationId] ?? scene.imagePrompt,
      status: "pending" as const,
      updatedAt: now,
    };
  });

  const nextBatch = {
    ...existing,
    images,
    updatedAt: now,
  };

  store.set(requestId, nextBatch);
  return nextBatch;
}

export function getImageBatch(requestId: string) {
  return getStore().get(requestId) ?? null;
}

export function getPendingScenes(requestId: string) {
  return (
    getImageBatch(requestId)?.images.filter((scene) => scene.status === "pending") ??
    []
  );
}

export function markBatchProcessing(requestId: string, isProcessing: boolean) {
  const batch = getImageBatch(requestId);

  if (!batch) {
    return null;
  }

  const nextBatch = {
    ...batch,
    isProcessing,
    updatedAt: new Date().toISOString(),
  };

  getStore().set(requestId, nextBatch);
  return nextBatch;
}

export function updateSceneRecord(
  requestId: string,
  locationId: string,
  patch: Partial<PalaceSceneRecord>,
) {
  const batch = getImageBatch(requestId);

  if (!batch) {
    return null;
  }

  const updatedAt = new Date().toISOString();

  const nextBatch = {
    ...batch,
    images: batch.images.map((scene) =>
      scene.locationId === locationId
        ? {
            ...scene,
            ...patch,
            updatedAt,
          }
        : scene,
    ),
    updatedAt,
  };

  getStore().set(requestId, nextBatch);
  return nextBatch;
}

export function serializeImageBatch(batch: PalaceImageBatch) {
  return {
    createdAt: batch.createdAt,
    images: batch.images.map((scene) => ({
      locationId: scene.locationId,
      status: scene.status,
      step: scene.step,
      imageDataUrl: scene.imageDataUrl,
      error: scene.error,
      updatedAt: scene.updatedAt,
    })),
    isProcessing: batch.isProcessing,
    requestId: batch.requestId,
    updatedAt: batch.updatedAt,
  };
}
