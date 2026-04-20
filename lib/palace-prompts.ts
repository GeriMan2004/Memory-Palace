import type { PalaceRouteStepRequest, PalaceStop } from "@/lib/palace-schema";

export const DEFAULT_ROUTE_MODEL =
  process.env.HF_ROUTE_MODEL ?? "Qwen/Qwen2.5-72B-Instruct:novita";

export const DEFAULT_IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell";

export function getHuggingFaceToken() {
  return (
    process.env.HF_API_TOKEN ??
    process.env.HF_TOKEN ??
    process.env.HUGGING_FACE_HUB_TOKEN ??
    null
  );
}

export function buildRouteMessages(items: string[]) {
  return [
    {
      role: "system",
      content: [
        "You design custom memory-palace journeys.",
        "Return strict JSON only and follow the provided schema exactly.",
        "Never use generic stock locations such as gate, hallway, library, kitchen, attic, corridor, or staircase unless the item list specifically implies them.",
        "Generate a single coherent route tailored to this exact item sequence.",
        "All locations must feel physically connected in one continuous walkable space.",
        "transitionHint must describe a concrete movement path from this stop toward the next stop.",
        "Preserve the item order exactly and echo each item string exactly as given.",
        "For every stop, make the keyword item unmistakable as the memory anchor.",
        "sceneTitle and mnemonicCue must explicitly mention the exact keyword item.",
        "The keyword item must be the dominant focal object of the scene.",
        "Keep routeTitle, routeMood, sceneTitle, mnemonicCue, and transitionHint concise but vivid.",
        "Every stop must feel visually distinct while belonging to one shared world.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        task: "Build a custom memory palace route for the exact ordered items.",
        rules: {
          strictJson: true,
          preserveExactOrder: true,
          oneStopPerItem: true,
          noTemplateSkeleton: true,
          conciseFields: true,
        },
        items,
      }),
    },
  ];
}

export function buildRouteStepMessages({
  existingStops,
  items,
  routeMood,
  routeTitle,
}: PalaceRouteStepRequest) {
  const nextIndex = existingStops.length;
  const previousStop = existingStops.at(-1);

  return [
    {
      role: "system",
      content: [
        "You generate the next single stop in a memory-palace journey.",
        "Return strict JSON only.",
        "Output keys: routeTitle, routeMood, stop.",
        "stop must include: step, item, locationId, locationLabel, sceneTitle, mnemonicCue, imagePromptSeed, transitionHint.",
        "Preserve exact item order and exact item text.",
        "Create a real physical connection between every location in order.",
        "sceneTitle and mnemonicCue must explicitly mention the exact keyword item.",
        "The keyword item must be the dominant focal object of the scene.",
        "transitionHint must be an actionable movement instruction the user can follow to reach the next location.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        expectedItem: items[nextIndex],
        existingStops,
        nextStep: nextIndex + 1,
        routeMood,
        routeTitle,
        rules: {
          avoidTemplateRoute: true,
          physicallyConnectedWorld: true,
          realPathInstruction: true,
          singleStopOnly: true,
        },
        totalItems: items.length,
        worldContinuityFromPreviousStop: previousStop ?? null,
      }),
    },
  ];
}

export function buildRouteRepairMessages(
  items: string[],
  invalidJsonContent: string,
) {
  return [
    {
      role: "system",
      content: [
        "You normalize malformed JSON into a strict memory-palace route schema.",
        "Return JSON only.",
        "Output keys: routeTitle (string), routeMood (string), stops (array).",
        "stops must be an array of objects, not strings.",
        "Each stop object must include: step, item, locationId, locationLabel, sceneTitle, mnemonicCue, imagePromptSeed, transitionHint.",
        "Preserve the exact input item order and exact item text.",
        "sceneTitle and mnemonicCue must explicitly mention the exact keyword item.",
        "The keyword item must be visually dominant in each scene.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        items,
        invalidModelOutput: invalidJsonContent,
      }),
    },
  ];
}

export function buildRouteStepRepairMessages({
  existingStops,
  invalidJsonContent,
  items,
  routeMood,
  routeTitle,
}: {
  existingStops: PalaceStop[];
  invalidJsonContent: string;
  items: string[];
  routeMood?: string;
  routeTitle?: string;
}) {
  const nextIndex = existingStops.length;

  return [
    {
      role: "system",
      content: [
        "You normalize malformed JSON into a strict next-stop memory-palace schema.",
        "Return strict JSON only.",
        "Output keys: routeTitle (string), routeMood (string), stop (object).",
        "stop must include: step, item, locationId, locationLabel, sceneTitle, mnemonicCue, imagePromptSeed, transitionHint.",
        "Preserve exact input item order and exact item text.",
        "Keep locations physically connected and keep transitionHint as a concrete path instruction.",
        "sceneTitle and mnemonicCue must explicitly mention the exact keyword item.",
        "The keyword item must be visually dominant in the scene.",
      ].join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        currentRouteMood: routeMood,
        currentRouteTitle: routeTitle,
        existingStops,
        invalidModelOutput: invalidJsonContent,
        nextExpectedItem: items[nextIndex],
      }),
    },
  ];
}

export function buildImagePrompt({
  routeMood,
  stop,
}: {
  routeMood: string;
  stop: PalaceStop;
}) {
  return [
    `Memory palace scene with a ${routeMood.toLowerCase()} mood.`,
    `Location: ${stop.locationLabel}.`,
    `Scene title: ${stop.sceneTitle}.`,
    `Keyword to remember: ${stop.item}.`,
    `Mnemonic focus: ${stop.imagePromptSeed}.`,
    `The keyword item "${stop.item}" must be the largest and clearest focal object.`,
    `${stop.mnemonicCue}.`,
    "Elegant surreal illustration, cinematic light, coherent palette across a series, no text, no watermark, no logo.",
  ].join(" ");
}
