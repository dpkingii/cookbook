import type { StepTimer } from "@/lib/recipe/types";

export type TimerMode = StepTimer["mode"];

interface Base<T extends string> {
  type: T;
  id: string;
  at: number;
}

export type SessionStarted = Base<"session_started">;
export interface MiseChecked extends Base<"mise_checked"> {
  ingredientId: string;
  checked: boolean;
}
export type CookingStarted = Base<"cooking_started">;
export interface StepEntered extends Base<"step_entered"> {
  stepIndex: number;
}
export interface StepCompleted extends Base<"step_completed"> {
  stepIndex: number;
}
export interface TimerStarted extends Base<"timer_started"> {
  timerId: string;
  stepIndex: number;
  endsAt: number;
  seconds: number;
  label: string;
  mode: TimerMode;
}
export interface TimerFinished extends Base<"timer_finished"> {
  timerId: string;
}
export interface TimerCancelled extends Base<"timer_cancelled"> {
  timerId: string;
}
export interface TimerAcknowledged extends Base<"timer_acknowledged"> {
  timerId: string;
}
export type SessionPaused = Base<"session_paused">;
export type SessionResumed = Base<"session_resumed">;
export interface SessionFinished extends Base<"session_finished"> {
  rating?: number;
  note?: string;
}

export type PlayerEvent =
  | SessionStarted
  | MiseChecked
  | CookingStarted
  | StepEntered
  | StepCompleted
  | TimerStarted
  | TimerFinished
  | TimerCancelled
  | TimerAcknowledged
  | SessionPaused
  | SessionResumed
  | SessionFinished;

export type PlayerEventType = PlayerEvent["type"];
export type EventOf<T extends PlayerEventType> = Extract<PlayerEvent, { type: T }>;

export const PLAYER_EVENT_TYPES = [
  "session_started",
  "mise_checked",
  "cooking_started",
  "step_entered",
  "step_completed",
  "timer_started",
  "timer_finished",
  "timer_cancelled",
  "timer_acknowledged",
  "session_paused",
  "session_resumed",
  "session_finished",
] as const satisfies readonly PlayerEventType[];
