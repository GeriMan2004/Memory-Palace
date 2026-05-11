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

function containsKeyword(value: string, keyword: string) {
  return normalizeItem(value).includes(normalizeItem(keyword));
}

function ensureKeywordInSceneTitle(sceneTitle: string, keyword: string) {
  const compact = compactString(sceneTitle, 80);

  if (containsKeyword(compact, keyword)) {
    return compact;
  }

  return compactString(`${compact}: ${keyword}`, 80);
}

function ensureKeywordInMnemonicCue(cue: string, keyword: string) {
  const compact = compactString(cue, 220);

  if (containsKeyword(compact, keyword)) {
    return compact;
  }

  return compactString(`Remember "${keyword}": ${compact}`, 220);
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

export const palaceRouteStepRequestSchema = z.object({
  existingStops: z.array(routeStopSchema).default([]),
  items: z
    .array(z.string().min(1).max(120))
    .min(ITEM_LIMITS.min)
    .max(ITEM_LIMITS.max),
  routeMood: z.string().min(1).max(80).optional(),
  routeTitle: z.string().min(1).max(80).optional(),
});

export const palaceSingleImageRequestSchema = z.object({
  routeMood: z.string().min(1).max(80),
  scene: routeStopSchema,
});

const routeStepResponseSchema = z.object({
  routeMood: z.string().min(1).max(80).optional(),
  routeTitle: z.string().min(1).max(80).optional(),
  stop: routeStopSchema,
});

export type PalaceRoute = z.infer<typeof palaceRouteSchema>;
export type PalaceStop = PalaceRoute["stops"][number];
export type PalaceRouteStepRequest = z.infer<typeof palaceRouteStepRequestSchema>;

export function normalizeItem(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function parsePalaceRouteStepPayload({
  currentRouteMood,
  currentRouteTitle,
  existingStops,
  items,
  rawPayload,
}: {
  currentRouteMood?: string;
  currentRouteTitle?: string;
  existingStops: PalaceStop[];
  items: string[];
  rawPayload: string | Record<string, unknown>;
}) {
  const targetIndex = existingStops.length;

  if (targetIndex >= items.length) {
    throw new Error("All requested items already have generated stops.");
  }

  const candidate =
    typeof rawPayload === "string"
      ? JSON.parse(extractJsonCandidate(rawPayload))
      : rawPayload;
  const parsed = routeStepResponseSchema.parse(candidate);
  const expectedItem = items[targetIndex];
  const usedLocationIds = new Set(
    existingStops.map((stop) => slugify(stop.locationId)),
  );
  const fallbackId = slugify(parsed.stop.locationLabel) || `stop-${targetIndex + 1}`;
  let locationId = slugify(parsed.stop.locationId) || fallbackId;

  while (usedLocationIds.has(locationId)) {
    locationId = `${locationId}-${targetIndex + 1}`;
  }

  if (normalizeItem(parsed.stop.item) !== normalizeItem(expectedItem)) {
    throw new Error(
      `Generated stop ${targetIndex + 1} did not preserve the expected input item.`,
    );
  }

  const routeTitle = compactString(
    parsed.routeTitle ?? currentRouteTitle ?? "",
    80,
  );
  const routeMood = compactString(parsed.routeMood ?? currentRouteMood ?? "", 80);

  if (!routeTitle || !routeMood) {
    throw new Error(
      "Step payload must include routeTitle and routeMood in the first generation cycle.",
    );
  }

  return {
    routeMood,
    routeTitle,
    stop: {
      imagePromptSeed: compactString(parsed.stop.imagePromptSeed, 260),
      item: compactString(expectedItem, 120),
      locationId,
      locationLabel: compactString(parsed.stop.locationLabel, 80),
      mnemonicCue: ensureKeywordInMnemonicCue(parsed.stop.mnemonicCue, expectedItem),
      sceneTitle: ensureKeywordInSceneTitle(parsed.stop.sceneTitle, expectedItem),
      step: targetIndex + 1,
      transitionHint: compactString(parsed.stop.transitionHint, 140),
    } satisfies PalaceStop,
  };
}
