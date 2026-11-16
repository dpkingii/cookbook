"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useState } from "react";
import type { Recipe } from "@/lib/recipe/types";
import { COUNTER, sceneAt, type Scene, type Vessel } from "./contents";
import { StageContext, usePrefersStill } from "./context";
import { clamp01 } from "./palette";
import { Backdrop, H, W } from "./Backdrop";
import { Board } from "./stations/Board";
import { Bowl } from "./stations/Bowl";
import { Fallback } from "./stations/Fallback";
import { Oven } from "./stations/Oven";
import { Pan } from "./stations/Pan";
import { Plate } from "./stations/Plate";
import { Pot } from "./stations/Pot";

export interface StageProps {
  recipe: Recipe;
  stepIndex: number;
  /** Fraction of this step's timer elapsed, 0–1. null when there is no timer or it has not started. */
  progress: number | null;
  className?: string;
}

function SceneFor({ scene }: { scene: Scene }) {
  switch (scene.vessel) {
    case "board":
      return <Board scene={scene} />;
    case "bowl":
      return <Bowl scene={scene} />;
    case "pan":
      return <Pan scene={scene} />;
    case "pot":
      return <Pot scene={scene} />;
    case "oven":
      return <Oven scene={scene} />;
    case "plate":
      return <Plate scene={scene} />;
    default:
      return <Fallback scene={scene} />;
  }
}

const slide = {
  enter: ({ dir, still }: { dir: number; still: boolean }) => ({ x: still ? 0 : dir * W * 0.35, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.2, 0.7, 0.2, 1] as const } },
  exit: ({ dir, still }: { dir: number; still: boolean }) => ({
    x: still ? 0 : -dir * W * 0.2,
    opacity: 0,
    transition: { duration: 0.16, ease: "easeIn" as const },
  }),
};

/** How much each station is enlarged around the counter so the action fills the frame. */
const ZOOM: Partial<Record<Vessel, number>> = { board: 1.2, pan: 1.14, pot: 1.12, bowl: 1.1, plate: 1.14 };
const ZOOM_AT = { x: W / 2, y: 200 };

function label(scene: Scene): string {
  const heat = scene.heat ? ` over ${scene.heat} heat` : "";
  const what = scene.uses.map((u) => u.name).join(", ");
  return `${scene.technique}${heat}${what ? `: ${what}` : ""}`;
}

export function Stage({ recipe, stepIndex, progress, className }: StageProps) {
  const still = usePrefersStill();
  const uid = `st${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = progress == null || Number.isNaN(progress) ? null : clamp01(progress);
  const scene = useMemo(
    () => (recipe.steps.length ? sceneAt(recipe, stepIndex, p) : null),
    [recipe, stepIndex, p],
  );
  const env = useMemo(() => ({ uid, still }), [uid, still]);

  const vessel = scene?.vessel ?? "board";
  const [shown, setShown] = useState<Vessel>(vessel);
  const [dir, setDir] = useState(1);
  if (shown !== vessel) {
    setDir(COUNTER.indexOf(vessel) >= COUNTER.indexOf(shown) ? 1 : -1);
    setShown(vessel);
  }

  return (
    <StageContext.Provider value={env}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={className}
        style={{ display: "block", width: "100%", height: "auto", overflow: "hidden" }}
        role="img"
        aria-label={scene ? label(scene) : "Empty stage"}
      >
        <Backdrop />
        <AnimatePresence initial={false} mode="wait" custom={{ dir, still }}>
          {scene && (
          <motion.g
            key={scene.vessel}
            custom={{ dir, still }}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <g
              transform={`translate(${ZOOM_AT.x} ${ZOOM_AT.y}) scale(${ZOOM[scene.vessel] ?? 1}) translate(${-ZOOM_AT.x} ${-ZOOM_AT.y})`}
            >
              <SceneFor scene={scene} />
            </g>
          </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </StageContext.Provider>
  );
}
