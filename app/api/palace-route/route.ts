import { NextResponse } from "next/server";

import {
  buildRouteStepMessages,
  buildRouteStepRepairMessages,
  buildRouteRepairMessages,
  buildRouteMessages,
  DEFAULT_ROUTE_MODEL,
  getHuggingFaceToken,
} from "@/lib/palace-prompts";
import {
  palaceRouteRequestSchema,
  palaceRouteStepRequestSchema,
  parsePalaceRoutePayload,
  parsePalaceRouteStepPayload,
} from "@/lib/palace-schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HF_DEBUG =
  process.env.HF_DEBUG === "1" || process.env.HF_DEBUG === "true";

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

type ChatMessage = {
  role: string;
  content: string;
};

function debugLog(message: string, metadata?: Record<string, unknown>) {
  if (!HF_DEBUG) {
    return;
  }

  if (metadata) {
    console.info(`[palace-route] ${message}`, metadata);
    return;
  }

  console.info(`[palace-route] ${message}`);
}

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

async function requestHuggingFaceCompletion({
  messages,
  model,
  token,
}: {
  messages: ChatMessage[];
  model: string;
  token: string;
}) {
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
        messages,
        response_format: {
          type: "json_object",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      details: await response.text(),
      ok: false as const,
      status: response.status,
    };
  }

  const payload = (await response.json()) as HuggingFaceChatResponse;
  const content = readMessageContent(payload.choices?.[0]?.message?.content);

  return {
    content,
    ok: true as const,
  };
}

async function requestRoute(items: string[]) {
  const token = getHuggingFaceToken();

  if (!token) {
    throw new Error(
      "Missing Hugging Face token. Set HF_API_TOKEN, HF_TOKEN, or HUGGING_FACE_HUB_TOKEN.",
    );
  }

  const modelCandidates = await expandRouteModelCandidates(
    DEFAULT_ROUTE_MODEL,
    token,
  );
  let lastError: Error | null = null;

  debugLog("Starting route generation request", {
    itemCount: items.length,
    modelCandidates,
  });

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      debugLog("Attempting Hugging Face completion", {
        attempt: attempt + 1,
        model,
        responseFormat: "json_object",
      });

      const completion = await requestHuggingFaceCompletion({
        messages: buildRouteMessages(items),
        model,
        token,
      });

      if (!completion.ok) {
        lastError = new Error(
          `Hugging Face route generation failed for ${model} (json_object) with ${completion.status}: ${completion.details}`,
        );
        debugLog("Hugging Face completion failed", {
          model,
          status: completion.status,
          details: completion.details,
        });

        const unsupportedProvider =
          completion.status === 400 &&
          completion.details.includes("not supported by provider");

        if (unsupportedProvider) {
          break;
        }

        continue;
      }

      const content = completion.content;

      try {
        const parsed = parsePalaceRoutePayload(content, items);
        debugLog("Route generation succeeded", {
          model,
          stopCount: parsed.stops.length,
        });
        return parsed;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Route model returned an invalid JSON payload.");
        debugLog("Route payload parsing failed", {
          model,
          parseError: lastError.message,
          rawContentPreview: content.slice(0, 260),
        });

        const repairCompletion = await requestHuggingFaceCompletion({
          messages: buildRouteRepairMessages(items, content),
          model,
          token,
        });

        if (!repairCompletion.ok) {
          lastError = new Error(
            `Hugging Face route repair failed for ${model} (json_object) with ${repairCompletion.status}: ${repairCompletion.details}`,
          );
          debugLog("Route repair request failed", {
            model,
            status: repairCompletion.status,
            details: repairCompletion.details,
          });
          continue;
        }

        try {
          const repaired = parsePalaceRoutePayload(
            repairCompletion.content,
            items,
          );
          debugLog("Route repair succeeded", {
            model,
            stopCount: repaired.stops.length,
          });
          return repaired;
        } catch (repairError) {
          lastError =
            repairError instanceof Error
              ? repairError
              : new Error("Route repair output remained invalid.");
          debugLog("Route repair parsing failed", {
            model,
            parseError: lastError.message,
            rawContentPreview: repairCompletion.content.slice(0, 260),
          });
        }
      }
    }
  }

  throw (
    lastError ?? new Error("Route model did not return a valid memory palace.")
  );
}

async function requestRouteStep({
  existingStops,
  items,
  routeMood,
  routeTitle,
}: {
  existingStops: ReturnType<typeof palaceRouteStepRequestSchema.parse>["existingStops"];
  items: string[];
  routeMood?: string;
  routeTitle?: string;
}) {
  const token = getHuggingFaceToken();

  if (!token) {
    throw new Error(
      "Missing Hugging Face token. Set HF_API_TOKEN, HF_TOKEN, or HUGGING_FACE_HUB_TOKEN.",
    );
  }

  const modelCandidates = await expandRouteModelCandidates(
    DEFAULT_ROUTE_MODEL,
    token,
  );
  let lastError: Error | null = null;

  debugLog("Starting step route generation request", {
    generatedStops: existingStops.length,
    itemCount: items.length,
    modelCandidates,
  });

  for (const model of modelCandidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      debugLog("Attempting Hugging Face step completion", {
        attempt: attempt + 1,
        generatedStops: existingStops.length,
        model,
      });

      const completion = await requestHuggingFaceCompletion({
        messages: buildRouteStepMessages({
          existingStops,
          items,
          routeMood,
          routeTitle,
        }),
        model,
        token,
      });

      if (!completion.ok) {
        lastError = new Error(
          `Hugging Face step generation failed for ${model} (json_object) with ${completion.status}: ${completion.details}`,
        );
        debugLog("Hugging Face step completion failed", {
          details: completion.details,
          model,
          status: completion.status,
        });

        const unsupportedProvider =
          completion.status === 400 &&
          completion.details.includes("not supported by provider");

        if (unsupportedProvider) {
          break;
        }

        continue;
      }

      try {
        const parsed = parsePalaceRouteStepPayload({
          currentRouteMood: routeMood,
          currentRouteTitle: routeTitle,
          existingStops,
          items,
          rawPayload: completion.content,
        });
        debugLog("Step route generation succeeded", {
          model,
          step: parsed.stop.step,
        });
        return parsed;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Step route model returned an invalid JSON payload.");
        debugLog("Step route parsing failed", {
          model,
          parseError: lastError.message,
          rawContentPreview: completion.content.slice(0, 260),
        });

        const repairCompletion = await requestHuggingFaceCompletion({
          messages: buildRouteStepRepairMessages({
            existingStops,
            invalidJsonContent: completion.content,
            items,
            routeMood,
            routeTitle,
          }),
          model,
          token,
        });

        if (!repairCompletion.ok) {
          lastError = new Error(
            `Hugging Face step repair failed for ${model} (json_object) with ${repairCompletion.status}: ${repairCompletion.details}`,
          );
          debugLog("Step route repair request failed", {
            details: repairCompletion.details,
            model,
            status: repairCompletion.status,
          });
          continue;
        }

        try {
          const repaired = parsePalaceRouteStepPayload({
            currentRouteMood: routeMood,
            currentRouteTitle: routeTitle,
            existingStops,
            items,
            rawPayload: repairCompletion.content,
          });
          debugLog("Step route repair succeeded", {
            model,
            step: repaired.stop.step,
          });
          return repaired;
        } catch (repairError) {
          lastError =
            repairError instanceof Error
              ? repairError
              : new Error("Step route repair output remained invalid.");
          debugLog("Step route repair parsing failed", {
            model,
            parseError: lastError.message,
            rawContentPreview: repairCompletion.content.slice(0, 260),
          });
        }
      }
    }
  }

  throw (
    lastError ??
    new Error("Step route generation failed for the current memory-palace item.")
  );
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    if (
      json &&
      typeof json === "object" &&
      "existingStops" in json
    ) {
      const {
        existingStops,
        items,
        routeMood,
        routeTitle,
      } = palaceRouteStepRequestSchema.parse(json);
      const normalizedItems = items.map((item) => item.trim()).filter(Boolean);
      const step = await requestRouteStep({
        existingStops,
        items: normalizedItems,
        routeMood,
        routeTitle,
      });

      return NextResponse.json(step, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

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
      error instanceof Error
        ? error.message
        : "Unable to generate memory palace.";
    console.error("[palace-route] POST failed", error);

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

export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed. Use POST /api/palace-route.",
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
