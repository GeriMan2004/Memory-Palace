"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/palace/ui/button";
import { Input } from "@/components/palace/ui/input";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { RouteChips, type RouteChip } from "@/components/palace/route-chips";
import { SceneImage } from "@/components/palace/scene-image";
import { CTA, formatStopLabel } from "@/lib/palace-copy";
import type { PalaceRoute } from "@/lib/palace-schema";

import { imageForStop, type ImageRecord } from "./types";

type PhaseRecallProps = {
  route: PalaceRoute;
  images: ImageRecord[];
  currentStep: number;
  onSubmit: (answer: string) => void;
};

export function PhaseRecall({
  route,
  images,
  currentStep,
  onSubmit,
}: PhaseRecallProps) {
  const total = route.stops.length;
  const stop = route.stops[currentStep - 1];
  const image = imageForStop(images, stop);

  const chips: RouteChip[] = route.stops.map((s) => {
    if (s.step < currentStep) return { step: s.step, state: "ready" };
    if (s.step === currentStep) return { step: s.step, state: "current" };
    return { step: s.step, state: "pending" };
  });

  return (
    <SpawnGroup
      className="flex flex-col gap-8"
      cycleKey={currentStep}
      staggerMs={44}
    >
      <div className="flex items-center justify-between gap-4">
        <RouteChips chips={chips} ariaLabel="Recall progress" />
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
          {formatStopLabel(currentStep, total)}
        </p>
      </div>

      <SceneImage
        alt={`Recall stop ${currentStep}`}
        image={image}
        className="mx-auto max-w-[640px]"
      />

      <RecallAnswerForm
        key={currentStep}
        currentStep={currentStep}
        total={total}
        onSubmit={onSubmit}
      />
    </SpawnGroup>
  );
}

function RecallAnswerForm({
  currentStep,
  total,
  onSubmit,
}: {
  currentStep: number;
  total: number;
  onSubmit: (answer: string) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
      }}
      className="mx-auto flex w-full max-w-[640px] items-center gap-2"
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Type the item"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={`Answer for ${formatStopLabel(currentStep, total)}`}
      />
      <Button type="submit" disabled={value.trim().length === 0}>
        {CTA.submit}
      </Button>
    </form>
  );
}
