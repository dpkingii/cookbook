import { useEffect, useState } from "react";

const DELAY_MS = 250;
const DURATION_MS = 900;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from `from` up to `to` with an ease-out; under reduced motion it starts at `to`. */
export function useCountUp(from: number, to: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? to : from));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const start = performance.now() + DELAY_MS;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
      setValue(Math.round(from + (to - from) * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return value;
}
