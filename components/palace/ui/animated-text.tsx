"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type AnimatedTextProps = {
  text: string;
  as?: React.ElementType;
  className?: string;
  wordClassName?: string;
  delayMs?: number;
  staggerMs?: number;
  /** Restart the animation when this changes. Defaults to text. */
  cycleKey?: string | number;
};

const MAX_TOTAL_STAGGER_MS = 400;

type RenderedSegment =
  | { kind: "word"; value: string; delay: number }
  | { kind: "space"; value: string };

export function AnimatedText({
  text,
  as: Component = "span",
  className,
  wordClassName,
  delayMs = 0,
  staggerMs = 38,
  cycleKey,
}: AnimatedTextProps) {
  const renderedSegments = React.useMemo<RenderedSegment[]>(() => {
    const segments = text.split(/(\s+)/);
    const wordCount = segments.filter(
      (segment) => segment && !/^\s+$/.test(segment),
    ).length;
    const effectiveStagger =
      wordCount > 1
        ? Math.min(staggerMs, Math.floor(MAX_TOTAL_STAGGER_MS / wordCount))
        : 0;

    const out: RenderedSegment[] = [];
    let wordIndex = 0;
    for (const segment of segments) {
      if (!segment) continue;
      if (/^\s+$/.test(segment)) {
        out.push({ kind: "space", value: segment });
      } else {
        out.push({
          kind: "word",
          value: segment,
          delay: delayMs + wordIndex * effectiveStagger,
        });
        wordIndex += 1;
      }
    }
    return out;
  }, [text, delayMs, staggerMs]);

  return (
    <Component
      key={cycleKey ?? text}
      className={cn("inline-block", className)}
      aria-label={text}
    >
      {renderedSegments.map((segment, index) => {
        if (segment.kind === "space") {
          return (
            <span key={index} aria-hidden>
              {segment.value}
            </span>
          );
        }
        return (
          <span
            key={index}
            aria-hidden
            className={cn("motion-spawn-word", wordClassName)}
            style={
              {
                "--spawn-delay": `${segment.delay}ms`,
              } as React.CSSProperties
            }
          >
            {segment.value}
          </span>
        );
      })}
    </Component>
  );
}

type MorphTextProps = {
  text: string;
  as?: React.ElementType;
  className?: string;
  innerClassName?: string;
};

export function MorphText({
  text,
  as: Component = "span",
  className,
  innerClassName,
}: MorphTextProps) {
  return (
    <Component className={cn("inline-block", className)} aria-live="polite">
      <span
        key={text}
        className={cn("motion-morph inline-block", innerClassName)}
      >
        {text}
      </span>
    </Component>
  );
}
