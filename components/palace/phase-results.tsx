"use client";

import type { CSSProperties } from "react";

import Image from "next/image";

import { Button } from "@/components/palace/ui/button";
import { MorphText } from "@/components/palace/ui/animated-text";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { RouteChips, type RouteChip } from "@/components/palace/route-chips";
import { CTA, formatStopLabel } from "@/lib/palace-copy";
import { normalizeItem, type PalaceRoute } from "@/lib/palace-schema";
import { useCountUp } from "@/lib/use-count-up";
import { cn } from "@/lib/utils";

import { imageForStop, type ImageRecord } from "./types";

type PhaseResultsProps = {
  route: PalaceRoute;
  images: ImageRecord[];
  answers: string[];
  onReviewMisses: () => void;
  onRestart: () => void;
};

export function PhaseResults({
  route,
  images,
  answers,
  onReviewMisses,
  onRestart,
}: PhaseResultsProps) {
  const total = route.stops.length;
  const correctness = route.stops.map(
    (stop, index) =>
      normalizeItem(answers[index] ?? "") === normalizeItem(stop.item),
  );
  const correctCount = correctness.filter(Boolean).length;
  const hasMisses = correctCount < total;

  const chips: RouteChip[] = route.stops.map((stop, index) => ({
    step: stop.step,
    state: correctness[index] ? "correct" : "wrong",
  }));

  return (
    <SpawnGroup className="flex flex-col gap-8" staggerMs={48}>
      <RouteChips chips={chips} ariaLabel="Run results" />

      <ScoreDisplay
        correctCount={correctCount}
        total={total}
        hasMisses={hasMisses}
      />

      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {route.stops.map((stop, index) => {
          const image = imageForStop(images, stop);
          const src =
            image?.status === "ready" ? image.imageDataUrl ?? undefined : undefined;
          const isCorrect = correctness[index];
          const answer = answers[index]?.trim() ?? "";

          return (
            <li
              key={stop.locationId}
              className="flex items-center gap-4 py-3"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
                {src ? (
                  <Image
                    alt={stop.sceneTitle}
                    src={src}
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  {formatStopLabel(stop.step, total)}
                </p>
                <p className="truncate text-sm text-fg">{stop.locationLabel}</p>
                <p className="truncate text-xs text-subtle">
                  {isCorrect
                    ? `Yours: ${answer}`
                    : `Yours: ${answer || "—"} · Answer: ${stop.item}`}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em]",
                  isCorrect
                    ? "border-success/60 text-success"
                    : "border-danger/60 text-danger",
                )}
              >
                {isCorrect ? "Correct" : "Wrong"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {hasMisses ? (
          <>
            <Button onClick={onReviewMisses}>{CTA.reviewMisses}</Button>
            <Button onClick={onRestart} variant="outline">
              {CTA.restart}
            </Button>
          </>
        ) : (
          <Button onClick={onRestart}>{CTA.restart}</Button>
        )}
      </div>
    </SpawnGroup>
  );
}

function ScoreDisplay({
  correctCount,
  total,
  hasMisses,
}: {
  correctCount: number;
  total: number;
  hasMisses: boolean;
}) {
  const animatedCount = useCountUp({ to: correctCount, durationMs: 720 });
  const missCount = total - correctCount;
  const summary = hasMisses
    ? `${missCount} stop${missCount === 1 ? "" : "s"} missed.`
    : "All stops held.";

  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtle">
        Score
      </p>
      <div className="flex items-baseline gap-3">
        <span
          aria-label={`${correctCount} of ${total}`}
          className="motion-spawn-fade font-mono text-7xl font-semibold leading-none tracking-tighter text-fg tabular-nums"
          style={{ "--spawn-delay": "0ms" } as CSSProperties}
        >
          {animatedCount}
        </span>
        <span
          aria-hidden
          className="motion-spawn-fade text-2xl text-subtle tabular-nums"
          style={{ "--spawn-delay": "120ms" } as CSSProperties}
        >
          / {total}
        </span>
      </div>
      <MorphText
        as="p"
        text={summary}
        className="text-sm text-muted"
      />
    </div>
  );
}
