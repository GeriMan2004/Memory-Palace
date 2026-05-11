export type AppPhase =
  | "build"
  | "generate"
  | "study"
  | "recall"
  | "results"
  | "mistakes";

export type GenerationKind = "idle" | "route" | "image";

export const PHASE_TITLE: Record<AppPhase, string> = {
  build: "Build",
  generate: "Generate",
  study: "Study",
  recall: "Recall",
  results: "Results",
  mistakes: "Mistakes",
};

export const PHASE_SUBTITLE: Record<AppPhase, string> = {
  build: "Choose your sequence",
  generate: "Building your route",
  study: "Walk the route in order",
  recall: "Name the item at each stop",
  results: "Your run",
  mistakes: "Stops you missed",
};

export function phaseTitle(phase: AppPhase) {
  return PHASE_TITLE[phase];
}

export function phaseSubtitle(phase: AppPhase) {
  return PHASE_SUBTITLE[phase];
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatStopLabel(step: number, total: number) {
  return `Stop ${pad2(step)} of ${pad2(total)}`;
}

export function formatStopShort(step: number, total: number) {
  return `${pad2(step)} / ${pad2(total)}`;
}

export function generationLine(
  kind: Exclude<GenerationKind, "idle">,
  step: number,
  total: number,
) {
  if (kind === "route") {
    return `Generating stop ${step} of ${total}`;
  }

  return `Rendering image ${step} of ${total}`;
}

export const CTA = {
  buildPalace: "Build palace",
  nextStop: "Next stop",
  previousStop: "Previous stop",
  startRecall: "Start recall",
  submit: "Submit",
  reviewMisses: "Review misses",
  buildFromMisses: "Build new palace from misses",
  restart: "Restart",
  retryStop: "Retry stop",
  retryImage: "Retry image",
  skipImage: "Skip image",
  cancelRun: "Cancel run",
  done: "Done",
} as const;

export const ERROR_TITLE = {
  route: (step: number) => `Stop ${pad2(step)} failed`,
  image: (step: number) => `Image ${pad2(step)} failed`,
} as const;
