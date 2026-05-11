"use client";

import Image from "next/image";

import { Button } from "@/components/palace/ui/button";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { RouteChips, type RouteChip } from "@/components/palace/route-chips";
import { CTA, formatStopLabel } from "@/lib/palace-copy";
import { normalizeItem, type PalaceRoute, type PalaceStop } from "@/lib/palace-schema";

import { imageForStop, type ImageRecord } from "./types";

type PhaseMistakesProps = {
  route: PalaceRoute;
  images: ImageRecord[];
  answers: string[];
  onRebuildFromMisses: (missedItems: string[]) => void;
  onDone: () => void;
};

export function PhaseMistakes({
  route,
  images,
  answers,
  onRebuildFromMisses,
  onDone,
}: PhaseMistakesProps) {
  const total = route.stops.length;

  const missed: Array<{ stop: PalaceStop; userAnswer: string }> = route.stops
    .map((stop, index) => ({
      stop,
      userAnswer: answers[index]?.trim() ?? "",
    }))
    .filter(
      ({ stop, userAnswer }) =>
        normalizeItem(userAnswer) !== normalizeItem(stop.item),
    );

  const chips: RouteChip[] = missed.map(({ stop }) => ({
    step: stop.step,
    state: "wrong",
  }));

  return (
    <SpawnGroup className="flex flex-col gap-8" staggerMs={48}>
      <RouteChips chips={chips} ariaLabel="Missed stops" />

      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
          Missed
        </p>
        <h2 className="mt-2 text-3xl font-medium tracking-tight text-fg">
          {missed.length} of {total} stop{missed.length === 1 ? "" : "s"}
        </h2>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {missed.map(({ stop, userAnswer }) => {
          const image = imageForStop(images, stop);
          const src =
            image?.status === "ready" ? image.imageDataUrl ?? undefined : undefined;
          return (
            <li
              key={stop.locationId}
              className="flex flex-col rounded-sm border border-border"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                {src ? (
                  <Image
                    alt={stop.sceneTitle}
                    src={src}
                    fill
                    sizes="(max-width: 640px) 100vw, 480px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtle">
                      No image
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
                  {formatStopLabel(stop.step, total)} · {stop.locationLabel}
                </p>
                <p className="text-base text-fg">
                  Answer: <span className="text-success">{stop.item}</span>
                </p>
                <p className="text-sm text-subtle">
                  Yours: <span className="text-danger">{userAnswer || "—"}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onRebuildFromMisses(missed.map(({ stop }) => stop.item))}
            disabled={missed.length < 3}
          >
            {CTA.buildFromMisses}
          </Button>
          <Button onClick={onDone} variant="outline">
            {CTA.done}
          </Button>
        </div>
        {missed.length < 3 ? (
          <p className="text-xs text-subtle">
            A new palace needs at least 3 stops. Add more misses to build again.
          </p>
        ) : null}
      </div>
    </SpawnGroup>
  );
}
