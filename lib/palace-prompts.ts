import type { PalaceStop } from "@/lib/palace-schema";

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
        "Preserve the item order exactly and echo each item string exactly as given.",
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
    `Mnemonic focus: ${stop.imagePromptSeed}.`,
    `Exact item anchor: ${stop.item}.`,
    `${stop.mnemonicCue}.`,
    "Elegant surreal illustration, cinematic light, one clear focal subject, coherent palette across a series, no text, no watermark, no logo.",
  ].join(" ");
}
