"use client";

import { Button } from "@/components/palace/ui/button";
import { CTA, ERROR_TITLE } from "@/lib/palace-copy";

export type ErrorStage = "route" | "image";

export type GenerationError = {
  stage: ErrorStage;
  step: number;
  message: string;
};

type ErrorStateProps = {
  error: GenerationError;
  onRetry: () => void;
  onSkipImage?: () => void;
  onRestart: () => void;
};

export function ErrorState({
  error,
  onRetry,
  onSkipImage,
  onRestart,
}: ErrorStateProps) {
  const title = ERROR_TITLE[error.stage](error.step);
  const retryLabel = error.stage === "route" ? CTA.retryStop : CTA.retryImage;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border border-danger/40 bg-danger/[0.04] p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.28em] text-danger">
        Error
      </p>
      <h3 className="mt-2 text-2xl font-medium text-fg">{title}</h3>
      <p className="mt-3 max-w-prose text-sm leading-6 text-muted">
        {error.message}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onRetry} variant="primary">
          {retryLabel}
        </Button>
        {error.stage === "image" && onSkipImage ? (
          <Button onClick={onSkipImage} variant="ghost">
            {CTA.skipImage}
          </Button>
        ) : null}
        <Button onClick={onRestart} variant="danger">
          {CTA.restart} run
        </Button>
      </div>
    </div>
  );
}
