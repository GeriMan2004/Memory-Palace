import { z } from "zod";

const ITEM_LIMITS = {
  min: 3,
  max: 8,
} as const;

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function compactString(value: string, maxLength: number) {
  return normalizeWhitespace(value).slice(0, maxLength);
}

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function extractJsonCandidate(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Model response did not contain a JSON object.");
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

const routeStopSchema = z.object({
  step: z.number().int().positive(),
  item: z.string().min(1).max(120),
  locationId: z.string().min(1).max(80),
  locationLabel: z.string().min(1).max(80),
  sceneTitle: z.string().min(1).max(80),
  mnemonicCue: z.string().min(1).max(220),
  imagePromptSeed: z.string().min(1).max(260),
  transitionHint: z.string().min(1).max(140),
});

export const palaceRouteSchema = z.object({
  routeTitle: z.string().min(1).max(80),
  routeMood: z.string().min(1).max(80),
  stops: z.array(routeStopSchema).min(ITEM_LIMITS.min).max(ITEM_LIMITS.max),
});

export const palaceRouteRequestSchema = z.object({
  items: z
    .array(z.string().min(1).max(120))
    .min(ITEM_LIMITS.min)
    .max(ITEM_LIMITS.max),
});

export const palaceImageStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
  "skipped",
]);

export const palaceImageRequestSchema = z.object({
  requestId: z.string().uuid().optional(),
  retryFailed: z.boolean().default(false),
  scenes: z.array(routeStopSchema).min(1).max(ITEM_LIMITS.max),
});

export type PalaceRoute = z.infer<typeof palaceRouteSchema>;
export type PalaceStop = PalaceRoute["stops"][number];
export type PalaceImageStatus = z.infer<typeof palaceImageStatusSchema>;
export type PalaceRouteRequest = z.infer<typeof palaceRouteRequestSchema>;
export type PalaceImageRequest = z.infer<typeof palaceImageRequestSchema>;

export const memoryPalaceRouteJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["routeTitle", "routeMood", "stops"],
  properties: {
    routeTitle: { type: "string", minLength: 1, maxLength: 80 },
    routeMood: { type: "string", minLength: 1, maxLength: 80 },
    stops: {
      type: "array",
      minItems: ITEM_LIMITS.min,
      maxItems: ITEM_LIMITS.max,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "step",
          "item",
          "locationId",
          "locationLabel",
          "sceneTitle",
          "mnemonicCue",
          "imagePromptSeed",
          "transitionHint",
        ],
        properties: {
          step: { type: "integer", minimum: 1 },
          item: { type: "string", minLength: 1, maxLength: 120 },
          locationId: { type: "string", minLength: 1, maxLength: 80 },
          locationLabel: { type: "string", minLength: 1, maxLength: 80 },
          sceneTitle: { type: "string", minLength: 1, maxLength: 80 },
          mnemonicCue: { type: "string", minLength: 1, maxLength: 220 },
          imagePromptSeed: { type: "string", minLength: 1, maxLength: 260 },
          transitionHint: { type: "string", minLength: 1, maxLength: 140 },
        },
      },
    },
  },
} as const;

export function normalizeItem(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function parsePalaceRoutePayload(
  rawPayload: string | Record<string, unknown>,
  items: string[],
) {
  const candidate =
    typeof rawPayload === "string"
      ? JSON.parse(extractJsonCandidate(rawPayload))
      : rawPayload;

  const parsed = palaceRouteSchema.parse(candidate);

  if (parsed.stops.length !== items.length) {
    throw new Error("Generated route did not return one stop per item.");
  }

  const normalizedInput = items.map(normalizeItem);
  const usedLocationIds = new Set<string>();

  const sanitizedStops = parsed.stops.map((stop, index) => {
    if (normalizeItem(stop.item) !== normalizedInput[index]) {
      throw new Error(`Stop ${index + 1} did not preserve the input item order.`);
    }

    const fallbackId = slugify(stop.locationLabel) || `stop-${index + 1}`;
    let locationId = slugify(stop.locationId) || fallbackId;

    while (usedLocationIds.has(locationId)) {
      locationId = `${locationId}-${index + 1}`;
    }

    usedLocationIds.add(locationId);

    return {
      step: index + 1,
      item: compactString(items[index], 120),
      locationId,
      locationLabel: compactString(stop.locationLabel, 80),
      sceneTitle: compactString(stop.sceneTitle, 80),
      mnemonicCue: compactString(stop.mnemonicCue, 220),
      imagePromptSeed: compactString(stop.imagePromptSeed, 260),
      transitionHint: compactString(stop.transitionHint, 140),
    };
  });

  return {
    routeTitle: compactString(parsed.routeTitle, 80),
    routeMood: compactString(parsed.routeMood, 80),
    stops: sanitizedStops,
  } satisfies PalaceRoute;
}
