"use client";

import * as React from "react";

type SpawnGroupProps = {
  as?: React.ElementType;
  children: React.ReactNode;
  /** Milliseconds between each direct child. */
  staggerMs?: number;
  baseDelayMs?: number;
  /** When this changes, the group remounts and animations replay. */
  cycleKey?: string | number;
  className?: string;
};

/**
 * Wrap a small number of **direct** children (logical blocks: chips, hero, form).
 * Each child is wrapped in a staggered block spawn animation.
 */
export function SpawnGroup({
  as: Component = "div",
  children,
  staggerMs = 48,
  baseDelayMs = 0,
  cycleKey,
  className,
}: SpawnGroupProps) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <Component key={cycleKey} className={className}>
      {items.map((child, index) => (
        <div
          key={index}
          className="motion-spawn-block w-full min-w-0"
          style={
            {
              "--spawn-delay": `${baseDelayMs + index * staggerMs}ms`,
            } as React.CSSProperties
          }
        >
          {child}
        </div>
      ))}
    </Component>
  );
}
