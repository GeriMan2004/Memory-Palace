import { NextResponse } from "next/server";

import {
  getImageBatch,
  getPendingScenes,
  markBatchProcessing,
  serializeImageBatch,
  updateSceneRecord,
  upsertImageBatch,
} from "@/lib/palace-batches";
import {
  buildImagePrompt,
  DEFAULT_IMAGE_MODEL,
  getHuggingFaceToken,
} from "@/lib/palace-prompts";
import { palaceImageRequestSchema } from "@/lib/palace-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toDataUrl(contentType: string, bytes: ArrayBuffer) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

async function generateSceneImage({
  imagePrompt,
  locationId,
  requestId,
}: {
  imagePrompt: string;
  locationId: string;
  requestId: string;
}) {
  const token = getHuggingFaceToken();

  if (!token) {
    updateSceneRecord(requestId, locationId, {
      error:
        "Missing Hugging Face token. Set HF_API_TOKEN, HF_TOKEN, or HUGGING_FACE_HUB_TOKEN.",
      status: "failed",
    });
    return;
  }

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${DEFAULT_IMAGE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imagePrompt,
        parameters: {
          guidance_scale: 3.5,
          height: 896,
          num_inference_steps: 8,
          width: 896,
        },
        options: {
          use_cache: false,
          wait_for_model: true,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();

    updateSceneRecord(requestId, locationId, {
      error: `Image generation failed with ${response.status}: ${errorText}`,
      status: "failed",
    });
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.startsWith("image/")) {
    const imageDataUrl = toDataUrl(contentType, await response.arrayBuffer());

    updateSceneRecord(requestId, locationId, {
      error: null,
      imageDataUrl,
      status: "ready",
    });
    return;
  }

  const errorPayload = await response.text();

  updateSceneRecord(requestId, locationId, {
    error: `Image generation returned ${contentType || "an unexpected response"}: ${errorPayload}`,
    status: "failed",
  });
}

async function runImageBatch(requestId: string) {
  const currentBatch = getImageBatch(requestId);

  if (!currentBatch || currentBatch.isProcessing) {
    return;
  }

  markBatchProcessing(requestId, true);

  try {
    const pendingScenes = getPendingScenes(requestId);

    await Promise.all(
      pendingScenes.map(async (scene) => {
        updateSceneRecord(requestId, scene.locationId, {
          attempts: scene.attempts + 1,
          error: null,
          status: "pending",
        });

        await generateSceneImage({
          imagePrompt: scene.imagePrompt,
          locationId: scene.locationId,
          requestId,
        });
      }),
    );
  } finally {
    markBatchProcessing(requestId, false);
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { requestId: incomingRequestId, retryFailed, scenes } =
      palaceImageRequestSchema.parse(json);
    const requestId = incomingRequestId ?? crypto.randomUUID();
    const imagePrompts = Object.fromEntries(
      scenes.map((scene) => [
        scene.locationId,
        buildImagePrompt({
          routeMood: json.routeMood ?? "luminous surreal",
          stop: scene,
        }),
      ]),
    );

    const batch = upsertImageBatch({
      imagePrompts,
      requestId,
      retryFailed,
      scenes,
    });

    void runImageBatch(requestId);

    return NextResponse.json(serializeImageBatch(batch), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate scene images.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required." },
      { status: 400 },
    );
  }

  const batch = getImageBatch(requestId);

  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }

  return NextResponse.json(serializeImageBatch(batch), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
