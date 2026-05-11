"use client";

import { cn } from "@/lib/utils";

export type ChipState =
  | "pending"
  | "generating"
  | "rendering"
  | "ready"
  | "failed"
  | "skipped"
  | "current"
  | "correct"
  | "wrong";

export type RouteChip = {
  step: number;
  state: ChipState;
};

type RouteChipsProps = {
  chips: RouteChip[];
  onSelect?: (step: number) => void;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
};

const STATE_LABEL: Record<ChipState, string> = {
  pending: "pending",
  generating: "generating",
  rendering: "rendering",
  ready: "ready",
  failed: "failed",
  skipped: "skipped",
  current: "current",
  correct: "correct",
  wrong: "wrong",
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function RouteChips({
  chips,
  onSelect,
  interactive = false,
  className,
  ariaLabel = "Route progress",
}: RouteChipsProps) {
  return (
    <ol
      aria-label={ariaLabel}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {chips.map((chip) => {
        const isInteractive = interactive && Boolean(onSelect);
        const stateClass = stateClassFor(chip.state);
        const content = (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-[11px] tracking-[0.18em]">
              {pad2(chip.step)}
            </span>
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", dotFor(chip.state))} />
          </span>
        );

        const label = `Stop ${pad2(chip.step)} ${STATE_LABEL[chip.state]}`;

        if (isInteractive) {
          return (
            <li key={chip.step}>
              <button
                type="button"
                onClick={() => onSelect?.(chip.step)}
                aria-label={label}
                aria-current={chip.state === "current" ? "step" : undefined}
                className={cn(
                  "inline-flex h-8 items-center justify-center border px-2.5 text-fg outline-none",
                  "transition-[transform,border-color,background-color,color,box-shadow] duration-150 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                  "hover:-translate-y-px hover:border-fg/60",
                  "active:translate-y-0",
                  stateClass,
                )}
              >
                {content}
              </button>
            </li>
          );
        }

        return (
          <li key={chip.step}>
            <span
              aria-label={label}
              aria-current={chip.state === "current" ? "step" : undefined}
              className={cn(
                "inline-flex h-8 items-center justify-center border px-2.5 text-fg transition-colors duration-150 ease-out",
                stateClass,
              )}
            >
              {content}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function stateClassFor(state: ChipState) {
  switch (state) {
    case "current":
      return "border-fg bg-fg text-bg";
    case "ready":
      return "border-border-strong text-fg";
    case "correct":
      return "border-success/60 text-success";
    case "wrong":
      return "border-danger/60 text-danger";
    case "failed":
      return "border-danger/60 text-danger";
    case "skipped":
      return "border-border text-subtle line-through";
    case "generating":
    case "rendering":
      return "border-fg/40 text-fg animate-pulse";
    case "pending":
    default:
      return "border-border text-subtle";
  }
}

function dotFor(state: ChipState) {
  switch (state) {
    case "current":
      return "bg-bg";
    case "ready":
      return "bg-fg";
    case "correct":
      return "bg-success";
    case "wrong":
    case "failed":
      return "bg-danger";
    case "skipped":
      return "bg-subtle";
    case "generating":
    case "rendering":
      return "bg-fg/70";
    case "pending":
    default:
      return "bg-subtle/50";
  }
}
