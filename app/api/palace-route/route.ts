import { NextResponse } from "next/server";

import {
  buildRouteMessages,
  DEFAULT_ROUTE_MODEL,
  getHuggingFaceToken,
} from "@/lib/palace-prompts";
import {
  memoryPalaceRouteJsonSchema,
  palaceRouteRequestSchema,
  parsePalaceRoutePayload,
} from "@/lib/palace-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProviderMapping = Record<
  string,
  {
    status?: string;
    task?: string;
  }
>;

type HuggingFaceChatResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            text?: string;
            type?: string;
          }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function splitModelAndProvider(model: string) {
  const separatorIndex = model.lastIndexOf(":");

  if (separatorIndex === -1) {
    return {
      modelId: model,
      provider: null,
    };
  }

  return {
    modelId: model.slice(0, separatorIndex),
    provider: model.slice(separatorIndex + 1),
  };
}

async function fetchProviderMappings(modelId: string, token: string) {
  const response = await fetch(
    `https://huggingface.co/api/models/${encodeURIComponent(modelId)}?expand[]=inferenceProviderMapping`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    inferenceProviderMapping?: ProviderMapping;
  };

  return payload.inferenceProviderMapping ?? null;
}

async function expandRouteModelCandidates(model: string, token: string) {
  const { modelId, provider } = splitModelAndProvider(model);
  const mapping = await fetchProviderMappings(modelId, token);
  const candidates = new Set<string>();

  if (provider) {
    candidates.add(`${modelId}:${provider}`);
  } else {
    candidates.add(modelId);
  }

  if (mapping) {
    for (const [candidateProvider, metadata] of Object.entries(mapping)) {
      if (metadata.status === "live" && metadata.task === "conversational") {
        candidates.add(`${modelId}:${candidateProvider}`);
      }
    }
  }

  if (!provider) {
    candidates.add(modelId);
  }

  return [...candidates];
}

function readMessageContent(
  content:
    | string
    | Array<{
        text?: string;
        type?: string;
      }>
    | undefined,
) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

async function requestRoute(items: string[]) {
  const token = getHuggingFaceToken();

  if (!token) {
    throw new Error(
      "Missing Hugging Face token. Set HF_API_TOKEN, HF_TOKEN, or HUGGING_FACE_HUB_TOKEN.",
    );
  }

  const modelCandidates = await expandRouteModelCandidates(DEFAULT_ROUTE_MODEL, token);
  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(
        "https://router.huggingface.co/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            messages: buildRouteMessages(items),
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "memory_palace_route",
                strict: true,
                schema: memoryPalaceRouteJsonSchema,
              },
            },
          }),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const details = await response.text();
        lastError = new Error(
          `Hugging Face route generation failed for ${model} with ${response.status}: ${details}`,
        );

        const unsupportedProvider =
          response.status === 400 &&
          details.includes("not supported by provider");

        if (unsupportedProvider) {
          break;
        }

        continue;
      }

      const payload = (await response.json()) as HuggingFaceChatResponse;
      const content = readMessageContent(payload.choices?.[0]?.message?.content);

      try {
        return parsePalaceRoutePayload(content, items);
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Route model returned an invalid JSON payload.");
      }
    }
  }

  throw lastError ?? new Error("Route model did not return a valid memory palace.");
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { items } = palaceRouteRequestSchema.parse(json);
    const normalizedItems = items.map((item) => item.trim()).filter(Boolean);
    const route = await requestRoute(normalizedItems);

    return NextResponse.json(route, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate memory palace.";

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
