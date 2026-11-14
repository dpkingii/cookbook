"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface StageEnv {
  /** Prefix that keeps clipPath and pattern ids unique per Stage on the page. */
  uid: string;
  still: boolean;
}

export const StageContext = createContext<StageEnv>({ uid: "stage", still: false });

export function useStage(): StageEnv {
  return useContext(StageContext);
}

/** Motion props for an ingredient landing in a vessel: dropped from above when new, else simply there. */
export function landing(fresh: boolean, still: boolean, order = 0, from = -110) {
  return {
    initial: fresh && !still ? { y: from, opacity: 0 } : false,
    animate: { y: 0, opacity: 1 },
    exit: still ? { opacity: 0 } : { y: -50, opacity: 0, transition: { duration: 0.25 } },
    transition: still
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 260, damping: 18, delay: 0.25 + order * 0.18 },
  };
}

/** Seconds since mount, ticking at a stop-motion ~25fps. Zero while inactive. */
export function useClock(active: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last > 40) {
        last = now;
        setT((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return active ? t : 0;
}
