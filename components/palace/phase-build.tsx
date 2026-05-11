"use client";

import { Button } from "@/components/palace/ui/button";
import { Input } from "@/components/palace/ui/input";
import { SpawnGroup } from "@/components/palace/ui/spawn-in";
import { RouteChips } from "@/components/palace/route-chips";
import { APP_DESCRIPTION, BUILD_AI_FOOTNOTE, CTA } from "@/lib/palace-copy";
import { cn } from "@/lib/utils";

const COUNT_OPTIONS = [3, 4, 5, 6, 7, 8] as const;

type PhaseBuildProps = {
  count: number;
  items: string[];
  onCountChange: (next: number) => void;
  onItemChange: (index: number, value: string) => void;
  onSubmit: () => void;
};

export function PhaseBuild({
  count,
  items,
  onCountChange,
  onItemChange,
  onSubmit,
}: PhaseBuildProps) {
  const canSubmit = items.length === count && items.every((item) => item.trim().length > 0);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onSubmit();
        }
      }}
    >
      <SpawnGroup
        className="flex flex-col gap-10"
        cycleKey={`build-${count}`}
        staggerMs={52}
      >
        <p className="text-sm leading-relaxed text-muted">{APP_DESCRIPTION}</p>

        <RouteChips
          chips={Array.from({ length: count }, (_, index) => ({
            step: index + 1,
            state: "pending",
          }))}
        />

        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-muted">
            How many stops
          </h2>
          <div className="grid grid-cols-6 gap-2">
            {COUNT_OPTIONS.map((option) => {
              const active = option === count;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onCountChange(option)}
                  aria-pressed={active}
                  className={cn(
                    "h-12 rounded-sm border text-sm outline-none",
                    "transition-[background-color,color,border-color,transform] duration-150 ease-out",
                    "focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
                    "active:translate-y-px",
                    active
                      ? "border-fg bg-fg text-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                      : "border-border text-muted hover:-translate-y-px hover:border-fg/60 hover:text-fg",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-[11px] uppercase tracking-[0.28em] text-muted">
            Enter the sequence
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-border font-mono text-xs tracking-[0.18em] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Input
                  value={item}
                  onChange={(event) => onItemChange(index, event.target.value)}
                  placeholder={`Item ${index + 1}`}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-subtle">{BUILD_AI_FOOTNOTE}</p>
          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
            {CTA.buildPalace}
          </Button>
        </div>
      </SpawnGroup>
    </form>
  );
}
