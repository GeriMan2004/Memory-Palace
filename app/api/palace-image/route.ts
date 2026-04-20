import { NextResponse } from "next/server";

import {
  buildImagePrompt,
  DEFAULT_IMAGE_MODEL,
  getHuggingFaceToken,
} from "@/lib/palace-prompts";
import { palaceSingleImageRequestSchema } from "@/lib/palace-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toDataUrl(contentType: string, bytes: ArrayBuffer) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { routeMood, scene } = palaceSingleImageRequestSchema.parse(json);
    const token = getHuggingFaceToken();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Missing Hugging Face token. Set HF_API_TOKEN, HF_TOKEN, or HUGGING_FACE_HUB_TOKEN.",
        },
        { status: 500 },
      );
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
          inputs: buildImagePrompt({
            routeMood,
            stop: scene,
          }),
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
      const details = await response.text();

      return NextResponse.json(
        {
          error: `Image generation failed with ${response.status}: ${details}`,
          locationId: scene.locationId,
          status: "failed",
          step: scene.step,
        },
        { status: 500 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      const details = await response.text();

      return NextResponse.json(
        {
          error: `Unexpected image response (${contentType || "unknown"}): ${details}`,
          locationId: scene.locationId,
          status: "failed",
          step: scene.step,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: null,
        imageDataUrl: toDataUrl(contentType, await response.arrayBuffer()),
        locationId: scene.locationId,
        status: "ready",
        step: scene.step,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate scene image.";

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

