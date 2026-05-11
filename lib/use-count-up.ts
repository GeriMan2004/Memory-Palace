"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type UseCountUpOptions = {
  to: number;
  durationMs?: number;
  /** Restart the animation when this changes. */
  cycleKey?: string | number;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerReducedMotion() {
  return false;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp({
  to,
  durationMs = 700,
  cycleKey,
}: UseCountUpOptions) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    const start = performance.now();
    const from = 0;
    const delta = to - from;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(progress);
      setValue(Math.round(from + delta * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [to, durationMs, cycleKey, reducedMotion]);

  return reducedMotion ? to : value;
}
