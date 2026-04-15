"use client";

import Image from "next/image";
import { Sparkles, Waypoints } from "lucide-react";

import type { PalaceRoute, PalaceStop } from "@/lib/palace-schema";
import { cn } from "@/lib/utils";

type ImageRecord = {
  error: string | null;
  imageDataUrl: string | null;
  locationId: string;
  status: "pending" | "ready" | "failed" | "skipped";
  step: number;
};

function getImageState(
  images: ImageRecord[],
  locationId: string,
): ImageRecord | undefined {
  return images.find((image) => image.locationId === locationId);
}

function SceneArtwork({
  image,
  muted = false,
  stop,
  subtitle,
}: {
  image?: ImageRecord;
  muted?: boolean;
  stop: PalaceStop;
  subtitle: string;
}) {
  const imageSrc =
    image?.status === "ready" ? image.imageDataUrl ?? undefined : undefined;

  return (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(253,238,214,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]">
      {imageSrc ? (
        <Image
          alt={stop.sceneTitle}
          className={cn(
            "object-cover transition duration-700",
            muted && "scale-[1.02] saturate-70 brightness-75",
          )}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 70vw"
          src={imageSrc}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(247,225,190,0.25),transparent_26%),radial-gradient(circle_at_78%_12%,rgba(211,152,90,0.18),transparent_28%),linear-gradient(140deg,rgba(23,19,16,0.9),rgba(11,10,9,0.98))]" />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,6,0.02),rgba(8,7,6,0.72)_68%,rgba(8,7,6,0.92))]" />

      {!imageSrc ? (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 text-center text-stone-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/6">
            <Sparkles className="h-5 w-5 text-[#e3bf8e]" />
          </div>
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.32em] text-stone-500">
              {image?.status === "failed" ? "Image missed" : "Rendering scene"}
            </p>
            <p className="text-lg text-stone-100">{stop.sceneTitle}</p>
            <p className="max-w-md px-6 text-sm text-stone-400">{subtitle}</p>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-black/28 px-3 py-1 text-[0.68rem] uppercase tracking-[0.28em] text-stone-300 backdrop-blur">
              Stop {String(stop.step).padStart(2, "0")}
            </div>
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[#d2ad79]">
                {stop.locationLabel}
              </p>
              <h2 className="mt-2 font-display text-3xl leading-none text-stone-50 sm:text-[2.65rem]">
                {stop.sceneTitle}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
              {subtitle}
            </p>
          </div>
          <div className="hidden rounded-full border border-white/10 bg-black/22 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.28em] text-stone-400 md:block">
            {image?.status === "ready" ? "Ready" : image?.status ?? "Pending"}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputConstellationStage({
  itemCount,
  items,
}: {
  itemCount: number;
  items: string[];
}) {
  const orbitItems = items.map((item, index) => item.trim() || `Item ${index + 1}`);

  return (
    <div className="relative h-full overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,232,204,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(173,116,72,0.16),transparent_34%),linear-gradient(160deg,rgba(13,11,9,0.92),rgba(6,6,6,0.98))]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:74px_74px] opacity-30" />
      <div className="absolute inset-0">
        {orbitItems.map((item, index) => {
          const angle = (index / orbitItems.length) * Math.PI * 2 - Math.PI / 2;
          const left = 50 + Math.cos(angle) * 35;
          const top = 50 + Math.sin(angle) * 30;

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              key={`${item}-${index}`}
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div className="rounded-full border border-white/10 bg-black/28 px-4 py-2 text-sm tracking-[0.02em] text-stone-200 shadow-[0_18px_40px_rgba(0,0,0,0.26)] backdrop-blur">
                <span className="mr-2 text-stone-500">{String(index + 1).padStart(2, "0")}</span>
                {item}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-60 w-60 items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle,rgba(246,224,192,0.22),rgba(14,11,9,0.86)_58%)] shadow-[0_0_140px_rgba(212,170,116,0.14)]">
          <div className="absolute inset-5 rounded-full border border-dashed border-white/8" />
          <div className="space-y-2 text-center">
            <p className="text-[0.7rem] uppercase tracking-[0.34em] text-stone-400">
              Exact sequence
            </p>
            <p className="font-display text-5xl text-stone-50">{itemCount}</p>
            <p className="text-sm text-stone-400">stops waiting for a route</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function JourneyRail({
  images,
  onSelectStop,
  route,
  selectedStopId,
}: {
  images: ImageRecord[];
  onSelectStop?: (locationId: string) => void;
  route: PalaceRoute;
  selectedStopId: string;
}) {
  return (
    <div className="grid auto-cols-[minmax(170px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1">
      {route.stops.map((stop) => {
        const image = getImageState(images, stop.locationId);
        const isActive = stop.locationId === selectedStopId;

        return (
          <button
            className={cn(
              "group rounded-[22px] border px-4 py-3 text-left transition duration-200",
              isActive
                ? "border-[#d5ab76] bg-[linear-gradient(180deg,rgba(233,194,137,0.12),rgba(255,255,255,0.04))]"
                : "border-white/8 bg-white/3 hover:bg-white/6",
            )}
            key={stop.locationId}
            onClick={() => onSelectStop?.(stop.locationId)}
            type="button"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.68rem] uppercase tracking-[0.24em] text-stone-500">
                {String(stop.step).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  image?.status === "ready" && "bg-emerald-300",
                  image?.status === "failed" && "bg-rose-300",
                  (!image || image.status === "pending") && "bg-[#d9ad73]",
                  image?.status === "skipped" && "bg-stone-500",
                )}
              />
            </div>
            <p className="mt-3 text-sm text-stone-100">{stop.locationLabel}</p>
            <p className="mt-1 text-xs text-stone-500">{stop.sceneTitle}</p>
          </button>
        );
      })}
    </div>
  );
}

function JourneyStage({
  images,
  onSelectStop,
  route,
  selectedStopId,
}: {
  images: ImageRecord[];
  onSelectStop: (locationId: string) => void;
  route: PalaceRoute;
  selectedStopId: string;
}) {
  const selectedStop =
    route.stops.find((stop) => stop.locationId === selectedStopId) ?? route.stops[0];
  const selectedImage = getImageState(images, selectedStop.locationId);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1">
        <SceneArtwork
          image={selectedImage}
          stop={selectedStop}
          subtitle={selectedStop.mnemonicCue}
        />
      </div>
      <JourneyRail
        images={images}
        onSelectStop={onSelectStop}
        route={route}
        selectedStopId={selectedStop.locationId}
      />
    </div>
  );
}

function RecallStage({
  images,
  route,
  stop,
}: {
  images: ImageRecord[];
  route: PalaceRoute;
  stop: PalaceStop;
}) {
  const selectedImage = getImageState(images, stop.locationId);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1">
        <SceneArtwork
          image={selectedImage}
          muted
          stop={stop}
          subtitle={stop.transitionHint}
        />
      </div>
      <JourneyRail
        images={images}
        route={route}
        selectedStopId={stop.locationId}
      />
    </div>
  );
}

function ResultsStage({
  answers,
  images,
  route,
}: {
  answers: string[];
  images: ImageRecord[];
  route: PalaceRoute;
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_320px]">
      <div className="min-h-0 rounded-[28px] border border-white/10 bg-white/4 p-4">
        <div className="grid h-full min-h-0 gap-3 overflow-y-auto pr-1">
          {route.stops.map((stop, index) => {
            const image = getImageState(images, stop.locationId);
            const imageSrc =
              image?.status === "ready" ? image.imageDataUrl ?? undefined : undefined;
            const userAnswer = answers[index] ?? "";
            const isCorrect =
              userAnswer.trim().toLowerCase() === stop.item.trim().toLowerCase();

            return (
              <div
                className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-black/18 p-3"
                key={stop.locationId}
              >
                <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  {imageSrc ? (
                    <Image
                      alt={stop.sceneTitle}
                      className="object-cover"
                      fill
                      sizes="72px"
                      src={imageSrc}
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-stone-500">
                    Stop {String(stop.step).padStart(2, "0")}
                  </p>
                  <p className="truncate text-sm text-stone-100">{stop.locationLabel}</p>
                  <p className="mt-1 truncate text-xs text-stone-500">
                    {isCorrect ? "Locked" : `Yours: ${userAnswer || "—"}`}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.24em]",
                    isCorrect
                      ? "bg-emerald-400/12 text-emerald-200"
                      : "bg-rose-400/12 text-rose-200",
                  )}
                >
                  {isCorrect ? "Correct" : stop.item}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(247,226,196,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6">
        <div className="flex h-full flex-col justify-between">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-stone-500">
              Journey held
            </p>
            <h2 className="mt-3 font-display text-4xl text-stone-50">
              {route.routeTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              {route.routeMood}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[#d5ab76]">
              Full path
            </p>
            <p className="text-sm leading-6 text-stone-300">
              {route.stops
                .map((stop) => stop.locationLabel)
                .join("  ·  ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PalaceStage({
  answers = [],
  currentStop,
  images,
  itemCount,
  items,
  phase,
  route,
  selectedStopId,
  onSelectStop,
}: {
  answers?: string[];
  currentStop?: PalaceStop;
  images: ImageRecord[];
  itemCount: number;
  items: string[];
  onSelectStop: (locationId: string) => void;
  phase: "input" | "route" | "recall" | "results";
  route: PalaceRoute | null;
  selectedStopId: string | null;
}) {
  return (
    <section className="relative min-h-[360px] overflow-hidden rounded-[34px] border border-white/10 bg-black/28 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.34)] sm:p-5">
      <div className="absolute inset-x-6 top-5 z-10 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/18 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.28em] text-stone-300 backdrop-blur">
          <Waypoints className="h-3.5 w-3.5 text-[#d9ad73]" />
          Visual route
        </div>
      </div>

      <div className="h-full pt-10">
        {phase === "input" || !route ? (
          <InputConstellationStage itemCount={itemCount} items={items} />
        ) : null}

        {phase === "route" && route && selectedStopId ? (
          <JourneyStage
            images={images}
            onSelectStop={onSelectStop}
            route={route}
            selectedStopId={selectedStopId}
          />
        ) : null}

        {phase === "recall" && route && currentStop ? (
          <RecallStage images={images} route={route} stop={currentStop} />
        ) : null}

        {phase === "results" && route ? (
          <ResultsStage answers={answers} images={images} route={route} />
        ) : null}
      </div>
    </section>
  );
}
