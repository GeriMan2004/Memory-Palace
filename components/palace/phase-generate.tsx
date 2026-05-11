"use client";

import { Button } from "@/components/palace/ui/button";
import { MorphText } from "@/components/palace/ui/animated-text";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { ErrorState, type GenerationError } from "@/components/palace/error-state";
import { RouteChips, type RouteChip } from "@/components/palace/route-chips";
import { CTA, generationLine } from "@/lib/palace-copy";

type PhaseGenerateProps = {
  total: number;
  status: { kind: "route" | "image"; step: number } | null;
  chips: RouteChip[];
  error: GenerationError | null;
  onRetry: () => void;
  onSkipImage: () => void;
  onCancel: () => void;
  onRestart: () => void;
};

export function PhaseGenerate({
  total,
  status,
  chips,
  error,
  onRetry,
  onSkipImage,
  onCancel,
  onRestart,
}: PhaseGenerateProps) {
  return (
    <SpawnGroup className="flex flex-col gap-10" staggerMs={56}>
      <RouteChips chips={chips} ariaLabel="Generation progress" />

      {error ? (
        <ErrorState
          error={error}
          onRetry={onRetry}
          onSkipImage={error.stage === "image" ? onSkipImage : undefined}
          onRestart={onRestart}
        />
      ) : (
        <section className="flex flex-col gap-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-subtle">
            Locked
          </p>
          <MorphText
            as="p"
            text={
              status ? generationLine(status.kind, status.step, total) : "Starting"
            }
            className="font-mono text-xl leading-tight text-fg sm:text-2xl"
            innerClassName="tracking-tight"
          />
          <div className="mt-2">
            <ProgressBar
              value={
                status
                  ? ((status.step - 1) + (status.kind === "image" ? 0.5 : 0)) / total
                  : 0
              }
            />
          </div>
        </section>
      )}

      <div>
        <Button onClick={onCancel} variant="outline" size="sm">
          {CTA.cancelRun}
        </Button>
      </div>
    </SpawnGroup>
  );
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="h-px w-full bg-border">
      <div
        className="h-px bg-fg transition-all duration-500"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
