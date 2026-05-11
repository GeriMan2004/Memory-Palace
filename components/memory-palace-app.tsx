"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PhaseBuild } from "@/components/palace/phase-build";
import { PhaseGenerate } from "@/components/palace/phase-generate";
import { PhaseMistakes } from "@/components/palace/phase-mistakes";
import { PhaseRecall } from "@/components/palace/phase-recall";
import { PhaseResults } from "@/components/palace/phase-results";
import { PhaseStudy } from "@/components/palace/phase-study";
import type { GenerationError } from "@/components/palace/error-state";
import type { RouteChip } from "@/components/palace/route-chips";
import type { ImageRecord } from "@/components/palace/types";
import { findImage } from "@/components/palace/types";
import { AnimatedText, MorphText } from "@/components/palace/ui/animated-text";
import {
  type AppPhase,
  AI_DISCLOSURE_LINE,
  APP_KICKER,
  phaseAiHint,
  phaseSubtitle,
  phaseTitle,
} from "@/lib/palace-copy";
import {
  type PalaceRoute,
  type PalaceStop,
} from "@/lib/palace-schema";

type StepRouteResponse = {
  routeMood: string;
  routeTitle: string;
  stop: PalaceStop;
};

type SingleImageResponse = {
  error: string | null;
  imageDataUrl?: string;
  locationId: string;
  status: "ready" | "failed";
  step: number;
};

type RecoveryChoice = "retry" | "skip" | "restart";

const DEFAULT_COUNT = 5;

function newItems(count: number, previous: string[] = []) {
  return Array.from({ length: count }, (_, index) => previous[index] ?? "");
}

function nowIso() {
  return new Date().toISOString();
}

export function MemoryPalaceApp() {
  const [phase, setPhase] = useState<AppPhase>("build");
  const [itemCount, setItemCount] = useState(DEFAULT_COUNT);
  const [items, setItems] = useState(() => newItems(DEFAULT_COUNT));
  const [route, setRoute] = useState<PalaceRoute | null>(null);
  const [imageRecords, setImageRecords] = useState<ImageRecord[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [studyStep, setStudyStep] = useState(1);
  const [generationStatus, setGenerationStatus] = useState<{
    kind: "route" | "image";
    step: number;
  } | null>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [generationTotal, setGenerationTotal] = useState(0);

  const runIdRef = useRef(0);
  const recoveryRef = useRef<((choice: RecoveryChoice) => void) | null>(null);

  const recallStep = answers.length + 1;

  function upsertImageRecord(next: ImageRecord) {
    setImageRecords((current) => {
      const filtered = current.filter(
        (record) => record.locationId !== next.locationId,
      );
      return [...filtered, next].sort((a, b) => a.step - b.step);
    });
  }

  async function requestNextStop(args: {
    existingStops: PalaceStop[];
    items: string[];
    routeMood?: string;
    routeTitle?: string;
  }): Promise<StepRouteResponse> {
    const response = await fetch("/api/palace-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const payload = (await response.json()) as
      | StepRouteResponse
      | { error?: string };

    if (!response.ok) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : "Unable to generate next route step.",
      );
    }

    return payload as StepRouteResponse;
  }

  async function requestImage(args: {
    routeMood: string;
    scene: PalaceStop;
  }): Promise<SingleImageResponse> {
    const response = await fetch("/api/palace-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const payload = (await response.json()) as
      | SingleImageResponse
      | { error?: string };

    if (!response.ok) {
      throw new Error(
        "error" in payload && payload.error
          ? payload.error
          : "Scene image generation failed.",
      );
    }

    return payload as SingleImageResponse;
  }

  function awaitRecovery(): Promise<RecoveryChoice> {
    return new Promise((resolve) => {
      recoveryRef.current = resolve;
    });
  }

  function resolveRecovery(choice: RecoveryChoice) {
    const resolver = recoveryRef.current;
    recoveryRef.current = null;
    setError(null);
    resolver?.(choice);
  }

  async function runGeneration(itemsToBuild: string[]) {
    runIdRef.current += 1;
    const myRunId = runIdRef.current;
    const total = itemsToBuild.length;

    setGenerationTotal(total);
    setRoute({ routeTitle: "", routeMood: "", stops: [] });
    setImageRecords([]);
    setAnswers([]);
    setError(null);
    setGenerationStatus(null);
    setPhase("generate");

    let title = "";
    let mood = "";
    let stops: PalaceStop[] = [];
    let i = 0;
    let subStep: "route" | "image" = "route";

    while (i < total) {
      if (runIdRef.current !== myRunId) return;

      if (subStep === "route") {
        setGenerationStatus({ kind: "route", step: i + 1 });
        try {
          const stepPayload = await requestNextStop({
            existingStops: stops,
            items: itemsToBuild,
            routeMood: stops.length > 0 ? mood : undefined,
            routeTitle: stops.length > 0 ? title : undefined,
          });
          if (runIdRef.current !== myRunId) return;
          title = stepPayload.routeTitle;
          mood = stepPayload.routeMood;
          stops = [...stops, stepPayload.stop];
          setRoute({ routeTitle: title, routeMood: mood, stops: [...stops] });
          subStep = "image";
        } catch (err) {
          if (runIdRef.current !== myRunId) return;
          setError({
            stage: "route",
            step: i + 1,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          const choice = await awaitRecovery();
          if (runIdRef.current !== myRunId) return;
          if (choice === "restart") {
            return;
          }
          continue;
        }
      } else {
        const stop = stops[stops.length - 1];
        setGenerationStatus({ kind: "image", step: i + 1 });
        upsertImageRecord({
          locationId: stop.locationId,
          step: stop.step,
          status: "pending",
          imageDataUrl: null,
          error: null,
          updatedAt: nowIso(),
        });
        try {
          const result = await requestImage({ routeMood: mood, scene: stop });
          if (runIdRef.current !== myRunId) return;
          upsertImageRecord({
            locationId: stop.locationId,
            step: stop.step,
            status: "ready",
            imageDataUrl: result.imageDataUrl ?? null,
            error: null,
            updatedAt: nowIso(),
          });
          i += 1;
          subStep = "route";
        } catch (err) {
          if (runIdRef.current !== myRunId) return;
          const message = err instanceof Error ? err.message : "Unknown error";
          upsertImageRecord({
            locationId: stop.locationId,
            step: stop.step,
            status: "failed",
            imageDataUrl: null,
            error: message,
            updatedAt: nowIso(),
          });
          setError({ stage: "image", step: i + 1, message });
          const choice = await awaitRecovery();
          if (runIdRef.current !== myRunId) return;
          if (choice === "restart") {
            return;
          }
          if (choice === "skip") {
            upsertImageRecord({
              locationId: stop.locationId,
              step: stop.step,
              status: "skipped",
              imageDataUrl: null,
              error: null,
              updatedAt: nowIso(),
            });
            i += 1;
            subStep = "route";
          }
        }
      }
    }

    if (runIdRef.current !== myRunId) return;
    setGenerationStatus(null);
    setStudyStep(1);
    setPhase("study");
  }

  const handleStartBuild = useCallback(() => {
    const trimmed = items.map((item) => item.trim());
    if (trimmed.some((item) => !item)) return;
    void runGeneration(trimmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function handleRebuildFromMisses(missedItems: string[]) {
    setItems(missedItems);
    setItemCount(missedItems.length);
    void runGeneration(missedItems);
  }

  function handleRestartRun() {
    runIdRef.current += 1;
    recoveryRef.current = null;
    setError(null);
    setGenerationStatus(null);
    setGenerationTotal(0);
    setRoute(null);
    setImageRecords([]);
    setAnswers([]);
    setStudyStep(1);
    setPhase("build");
  }

  function handleHardRestart() {
    handleRestartRun();
    setItemCount(DEFAULT_COUNT);
    setItems(newItems(DEFAULT_COUNT));
  }

  function handleCountChange(next: number) {
    setItemCount(next);
    setItems((current) => newItems(next, current));
  }

  function handleItemChange(index: number, value: string) {
    setItems((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? value : entry)),
    );
  }

  function handleNextStudy() {
    if (!route) return;
    setStudyStep((current) => Math.min(route.stops.length, current + 1));
  }

  function handlePrevStudy() {
    setStudyStep((current) => Math.max(1, current - 1));
  }

  function handleJumpStudy(step: number) {
    setStudyStep(step);
  }

  function handleStartRecall() {
    if (!route) return;
    setAnswers([]);
    setPhase("recall");
  }

  function handleSubmitRecall(answer: string) {
    if (!route) return;
    const next = [...answers, answer];
    setAnswers(next);
    if (next.length === route.stops.length) {
      setPhase("results");
    }
  }

  function handleReviewMisses() {
    setPhase("mistakes");
  }

  const chipsForGenerate = useCallback((): RouteChip[] => {
    const total = generationTotal || itemCount;
    const builtCount = route?.stops.length ?? 0;
    return Array.from({ length: total }, (_, index) => {
      const step = index + 1;
      const stop = route?.stops[index];
      const image = stop ? findImage(imageRecords, stop.locationId) : undefined;

      if (error && step === error.step) {
        return { step, state: "failed" };
      }
      if (step <= builtCount) {
        if (image?.status === "ready") return { step, state: "ready" };
        if (image?.status === "failed") return { step, state: "failed" };
        if (image?.status === "skipped") return { step, state: "skipped" };
        if (image?.status === "pending" && generationStatus?.step === step) {
          return { step, state: "rendering" };
        }
        return { step, state: "ready" };
      }
      if (generationStatus?.step === step) {
        return {
          step,
          state: generationStatus.kind === "route" ? "generating" : "rendering",
        };
      }
      return { step, state: "pending" };
    });
  }, [generationStatus, generationTotal, imageRecords, itemCount, route, error]);

  useEffect(() => {
    if (phase !== "study") return;
    setStudyStep((current) => {
      if (!route) return 1;
      return Math.min(Math.max(1, current), route.stops.length);
    });
  }, [phase, route]);

  function renderPhase() {
    if (phase === "build") {
      return (
        <PhaseBuild
          count={itemCount}
          items={items}
          onCountChange={handleCountChange}
          onItemChange={handleItemChange}
          onSubmit={handleStartBuild}
        />
      );
    }

    if (phase === "generate") {
      return (
        <PhaseGenerate
          total={generationTotal || itemCount}
          status={generationStatus}
          chips={chipsForGenerate()}
          error={error}
          onRetry={() => resolveRecovery("retry")}
          onSkipImage={() => resolveRecovery("skip")}
          onCancel={handleRestartRun}
          onRestart={() => {
            resolveRecovery("restart");
            handleRestartRun();
          }}
        />
      );
    }

    if (phase === "study" && route) {
      return (
        <PhaseStudy
          route={route}
          images={imageRecords}
          currentStep={studyStep}
          onPrev={handlePrevStudy}
          onNext={handleNextStudy}
          onJump={handleJumpStudy}
          onStartRecall={handleStartRecall}
        />
      );
    }

    if (phase === "recall" && route) {
      return (
        <PhaseRecall
          route={route}
          images={imageRecords}
          currentStep={recallStep}
          onSubmit={handleSubmitRecall}
        />
      );
    }

    if (phase === "results" && route) {
      return (
        <PhaseResults
          route={route}
          images={imageRecords}
          answers={answers}
          onReviewMisses={handleReviewMisses}
          onRestart={handleHardRestart}
        />
      );
    }

    if (phase === "mistakes" && route) {
      return (
        <PhaseMistakes
          route={route}
          images={imageRecords}
          answers={answers}
          onRebuildFromMisses={handleRebuildFromMisses}
          onDone={handleHardRestart}
        />
      );
    }

    return null;
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10 sm:py-16">
        <Header phase={phase} />
        <main className="min-w-0">{renderPhase()}</main>
      </div>
    </div>
  );
}

function Header({ phase }: { phase: AppPhase }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-subtle">
          {APP_KICKER}
        </p>
        <AnimatedText
          as="p"
          text={phaseSubtitle(phase)}
          cycleKey={phase}
          className="text-base font-medium leading-snug text-fg"
        />
        <AnimatedText
          as="p"
          text={phaseAiHint(phase)}
          cycleKey={phase}
          delayMs={80}
          staggerMs={32}
          className="max-w-md text-xs leading-relaxed text-subtle"
        />
        <p className="max-w-md font-mono text-[10px] leading-relaxed tracking-wide text-subtle/80">
          {AI_DISCLOSURE_LINE}
        </p>
      </div>
      <MorphText
        as="p"
        text={phaseTitle(phase)}
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.36em] text-fg"
      />
    </header>
  );
}
