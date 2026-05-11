"use client";

import { Button } from "@/components/palace/ui/button";
import { AnimatedText, MorphText } from "@/components/palace/ui/animated-text";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { RouteChips, type RouteChip } from "@/components/palace/route-chips";
import { SceneImage } from "@/components/palace/scene-image";
import { CTA, formatStopLabel } from "@/lib/palace-copy";
import type { PalaceRoute } from "@/lib/palace-schema";

import { imageForStop, type ImageRecord } from "./types";

type PhaseStudyProps = {
  route: PalaceRoute;
  images: ImageRecord[];
  currentStep: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (step: number) => void;
  onStartRecall: () => void;
};

export function PhaseStudy({
  route,
  images,
  currentStep,
  onPrev,
  onNext,
  onJump,
  onStartRecall,
}: PhaseStudyProps) {
  const total = route.stops.length;
  const stop = route.stops[currentStep - 1];
  const image = imageForStop(images, stop);
  const isFirst = currentStep === 1;
  const isLast = currentStep === total;

  const chips: RouteChip[] = route.stops.map((s) => ({
    step: s.step,
    state: s.step === currentStep ? "current" : "ready",
  }));

  return (
    <SpawnGroup
      className="flex flex-col gap-8"
      cycleKey={`study-${route.routeTitle}-${currentStep}`}
      staggerMs={48}
    >
      <RouteChips
        chips={chips}
        interactive
        onSelect={onJump}
        ariaLabel="Jump to stop"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <SceneImage alt={stop.sceneTitle} image={image} />

        <div className="flex flex-col gap-6">
          <div>
            <MorphText
              as="p"
              text={formatStopLabel(currentStep, total)}
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted"
            />
            <AnimatedText
              as="h2"
              text={stop.locationLabel}
              cycleKey={`${stop.locationId}-label`}
              className="mt-3 text-3xl font-medium leading-tight tracking-tight text-fg"
            />
            <AnimatedText
              as="p"
              text={stop.sceneTitle}
              cycleKey={`${stop.locationId}-scene`}
              delayMs={120}
              className="mt-2 text-base text-muted"
            />
          </div>

          <div className="rounded-sm border border-border-strong p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
              Key item
            </p>
            <AnimatedText
              as="p"
              text={stop.item}
              cycleKey={`${stop.locationId}-item`}
              delayMs={60}
              className="mt-2 text-2xl font-medium text-fg"
            />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
              Mnemonic cue
            </p>
            <p className="mt-2 text-sm leading-6 text-fg/90">{stop.mnemonicCue}</p>
          </div>

          {!isLast ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                Path to next stop
              </p>
              <p className="mt-2 text-sm leading-6 text-fg/90">
                {stop.transitionHint}
              </p>
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            {isLast ? (
              <Button onClick={onStartRecall}>{CTA.startRecall}</Button>
            ) : (
              <Button onClick={onNext}>{CTA.nextStop}</Button>
            )}
            <Button
              onClick={onPrev}
              disabled={isFirst}
              variant="ghost"
              size="icon"
              aria-label={CTA.previousStop}
            >
              <PreviousIcon />
            </Button>
          </div>
        </div>
      </div>
    </SpawnGroup>
  );
}

function PreviousIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  );
}
