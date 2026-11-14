import type { Recipe } from "@/lib/recipe/types";
import type { EventOf, PlayerEvent, PlayerEventType, TimerMode } from "./events";

export type Phase = "mise" | "cooking" | "finished";
export type TimerStatus = "running" | "ringing" | "done" | "cancelled";

export interface Timer {
  id: string;
  stepIndex: number;
  label: string;
  mode: TimerMode;
  seconds: number;
  startedAt: number;
  endsAt: number;
  /** Set while the session is paused; remaining time is measured against it instead of now. */
  pausedAt: number | null;
  status: TimerStatus;
}

export interface PlayerState {
  stepCount: number;
  ingredientIds: readonly string[];
  phase: Phase;
  currentStep: number;
  completed: readonly number[];
  checked: readonly string[];
  timers: readonly Timer[];
  startedAt: number | null;
  cookingStartedAt: number | null;
  finishedAt: number | null;
  paused: boolean;
  pausedAt: number | null;
  pausedMs: number;
  rating: number | null;
  note: string | null;
  applied: Readonly<Record<string, true>>;
}

export function initialState(recipe: Recipe): PlayerState {
  return {
    stepCount: recipe.steps.length,
    ingredientIds: recipe.ingredients.map((i) => i.id),
    phase: "mise",
    currentStep: 0,
    completed: [],
    checked: [],
    timers: [],
    startedAt: null,
    cookingStartedAt: null,
    finishedAt: null,
    paused: false,
    pausedAt: null,
    pausedMs: 0,
    rating: null,
    note: null,
    applied: {},
  };
}

type Handler<T extends PlayerEventType> = (s: PlayerState, e: EventOf<T>) => PlayerState | null;

const isLive = (s: PlayerState) => s.startedAt !== null && s.phase !== "finished";
const isCooking = (s: PlayerState) => s.phase === "cooking" && !s.paused;
const isStep = (s: PlayerState, i: number) => Number.isInteger(i) && i >= 0 && i < s.stepCount;
const findTimer = (s: PlayerState, id: string) => s.timers.find((t) => t.id === id);
const mapTimers = (s: PlayerState, fn: (t: Timer) => Timer): readonly Timer[] => s.timers.map(fn);

function setTimerStatus(s: PlayerState, id: string, from: TimerStatus, to: TimerStatus) {
  if (findTimer(s, id)?.status !== from) return null;
  return { ...s, timers: mapTimers(s, (t) => (t.id === id ? { ...t, status: to } : t)) };
}

const handlers: { [T in PlayerEventType]: Handler<T> } = {
  session_started: (s, e) => (s.startedAt === null ? { ...s, startedAt: e.at } : null),

  mise_checked: (s, e) => {
    if (!isLive(s) || s.phase !== "mise" || !s.ingredientIds.includes(e.ingredientId)) return null;
    const has = s.checked.includes(e.ingredientId);
    if (has === e.checked) return null;
    return {
      ...s,
      checked: e.checked ? [...s.checked, e.ingredientId] : s.checked.filter((id) => id !== e.ingredientId),
    };
  },

  cooking_started: (s, e) =>
    isLive(s) && s.phase === "mise" && !s.paused
      ? { ...s, phase: "cooking", currentStep: 0, cookingStartedAt: e.at }
      : null,

  step_entered: (s, e) =>
    isCooking(s) && isStep(s, e.stepIndex) && e.stepIndex !== s.currentStep
      ? { ...s, currentStep: e.stepIndex }
      : null,

  step_completed: (s, e) =>
    isCooking(s) && e.stepIndex === s.currentStep && !s.completed.includes(e.stepIndex)
      ? { ...s, completed: [...s.completed, e.stepIndex].sort((a, b) => a - b) }
      : null,

  timer_started: (s, e) => {
    if (!isCooking(s) || !isStep(s, e.stepIndex) || !(e.seconds > 0) || findTimer(s, e.timerId)) return null;
    const stepBusy = s.timers.some(
      (t) => t.stepIndex === e.stepIndex && (t.status === "running" || t.status === "ringing"),
    );
    if (stepBusy) return null;
    const timer: Timer = {
      id: e.timerId,
      stepIndex: e.stepIndex,
      label: e.label,
      mode: e.mode,
      seconds: e.seconds,
      startedAt: e.at,
      endsAt: e.endsAt,
      pausedAt: null,
      status: "running",
    };
    return { ...s, timers: [...s.timers, timer] };
  },

  timer_finished: (s, e) => (isCooking(s) ? setTimerStatus(s, e.timerId, "running", "ringing") : null),
  timer_cancelled: (s, e) => (isLive(s) ? setTimerStatus(s, e.timerId, "running", "cancelled") : null),
  timer_acknowledged: (s, e) => (isLive(s) ? setTimerStatus(s, e.timerId, "ringing", "done") : null),

  session_paused: (s, e) => {
    if (!isLive(s) || s.paused) return null;
    return {
      ...s,
      paused: true,
      pausedAt: e.at,
      timers: mapTimers(s, (t) => (t.status === "running" ? { ...t, pausedAt: e.at } : t)),
    };
  },

  session_resumed: (s, e) => {
    if (!isLive(s) || s.pausedAt === null || e.at < s.pausedAt) return null;
    return { ...unpause(s, e.at), timers: shiftPausedTimers(s.timers, e.at) };
  },

  session_finished: (s, e) => {
    if (!isLive(s)) return null;
    const settled = s.paused ? unpause(s, e.at) : s;
    return {
      ...settled,
      phase: "finished",
      finishedAt: e.at,
      rating: e.rating ?? null,
      note: e.note ?? null,
      timers: mapTimers(s, (t) =>
        t.status === "running"
          ? { ...t, pausedAt: null, status: "cancelled" }
          : t.status === "ringing"
            ? { ...t, status: "done" }
            : t,
      ),
    };
  },
};

function unpause(s: PlayerState, at: number): PlayerState {
  return { ...s, paused: false, pausedAt: null, pausedMs: s.pausedMs + Math.max(0, at - (s.pausedAt ?? at)) };
}

function shiftPausedTimers(timers: readonly Timer[], at: number): readonly Timer[] {
  return timers.map((t) =>
    t.pausedAt === null ? t : { ...t, endsAt: t.endsAt + (at - t.pausedAt), pausedAt: null },
  );
}

function applyEvent(state: PlayerState, event: PlayerEvent): PlayerState {
  if (state.applied[event.id]) return state;
  const handler = handlers[event.type] as Handler<PlayerEventType>;
  const next = handler(state, event as never);
  if (!next) return state;
  return { ...next, applied: { ...state.applied, [event.id]: true } };
}

/** Works directly as a `useReducer` reducer; dispatch a single event or the array a command returns. */
export function reduce(state: PlayerState, action: PlayerEvent | readonly PlayerEvent[]): PlayerState {
  return isEventList(action) ? action.reduce(applyEvent, state) : applyEvent(state, action);
}

function isEventList(action: PlayerEvent | readonly PlayerEvent[]): action is readonly PlayerEvent[] {
  return Array.isArray(action);
}

export function replay(recipe: Recipe, events: readonly PlayerEvent[]): PlayerState {
  return reduce(initialState(recipe), events);
}
