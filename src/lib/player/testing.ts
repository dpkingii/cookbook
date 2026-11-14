import type { PlayerEvent } from "./events";

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type EventInput = DistributiveOmit<PlayerEvent, "id" | "at">;

export function sequentialIds(prefix = "id") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export function eventFactory() {
  const nextId = sequentialIds("evt");
  return (at: number, input: EventInput): PlayerEvent =>
    ({ ...input, id: nextId(), at }) as PlayerEvent;
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
