import type { Recipe, Technique } from "@/lib/recipe/types";
import type { PlayerState, Timer } from "./reducer";

const PLAUSIBLE_FRACTION = 0.25;

const isActive = (t: Timer) => t.status === "running" || t.status === "ringing";

export function remainingMs(timer: Timer, now: number): number {
  if (timer.status !== "running") return 0;
  return Math.max(0, timer.endsAt - (timer.pausedAt ?? now));
}

export function timerForStep(state: PlayerState, stepIndex: number): Timer | null {
  return state.timers.findLast((t) => t.stepIndex === stepIndex) ?? null;
}

export function dockTimers(state: PlayerState): Timer[] {
  return state.timers
    .filter((t) => isActive(t) && t.stepIndex !== state.currentStep)
    .sort((a, b) => a.endsAt - b.endsAt);
}

export function ringingTimers(state: PlayerState): Timer[] {
  return state.timers.filter((t) => t.status === "ringing");
}

export function hasUnfinishedStayTimer(state: PlayerState): boolean {
  const t = timerForStep(state, state.currentStep);
  return t?.mode === "stay" && t.status === "running";
}

export function stepProgress(state: PlayerState, recipe: Recipe, now: number): number | null {
  if (!recipe.steps[state.currentStep]?.timer) return null;
  const t = timerForStep(state, state.currentStep);
  if (!t || t.status === "cancelled") return null;
  if (t.status !== "running") return 1;
  return Math.min(1, Math.max(0, 1 - remainingMs(t, now) / (t.seconds * 1000)));
}

export function elapsedMs(state: PlayerState, now: number): number {
  if (state.startedAt === null) return 0;
  const end = state.finishedAt ?? state.pausedAt ?? now;
  return Math.max(0, end - state.startedAt - state.pausedMs);
}

export interface SessionSummary {
  durationSeconds: number;
  techniques: Technique[];
  completedSteps: number;
  totalSteps: number;
  plausible: boolean;
}

export function summary(state: PlayerState, recipe: Recipe): SessionSummary {
  const finished = state.finishedAt !== null;
  const duration = finished ? elapsedMs(state, state.finishedAt!) : 0;
  const timerMs = recipe.steps.reduce((sum, s) => sum + (s.timer?.seconds ?? 0), 0) * 1000;
  const techniques = [...new Set(state.completed.map((i) => recipe.steps[i]?.technique).filter((t) => t !== undefined))];
  return {
    durationSeconds: Math.round(duration / 1000),
    techniques,
    completedSteps: state.completed.length,
    totalSteps: recipe.steps.length,
    plausible: finished && duration >= PLAUSIBLE_FRACTION * timerMs,
  };
}
