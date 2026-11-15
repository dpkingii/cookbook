import { z } from "zod";
import type { PlayerEvent } from "@/lib/player";

export const MAX_EVENTS_PER_REQUEST = 500;

const CLOCK_SKEW_MS = 10 * 60_000;

const base = {
  id: z.uuid(),
  at: z
    .number()
    .int()
    .positive()
    .refine((at) => at <= Date.now() + CLOCK_SKEW_MS, "from the future"),
};
const stepIndex = z.number().int().min(0).max(1000);
const refId = z.string().min(1).max(64);

const eventSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("session_started") }),
  z.object({ ...base, type: z.literal("mise_checked"), ingredientId: refId, checked: z.boolean() }),
  z.object({ ...base, type: z.literal("cooking_started") }),
  z.object({ ...base, type: z.literal("step_entered"), stepIndex }),
  z.object({ ...base, type: z.literal("step_completed"), stepIndex }),
  z.object({
    ...base,
    type: z.literal("timer_started"),
    timerId: refId,
    stepIndex,
    endsAt: z.number().int().positive(),
    seconds: z.number().positive().max(86_400),
    label: z.string().max(200),
    mode: z.enum(["stay", "background"]),
  }),
  z.object({ ...base, type: z.literal("timer_finished"), timerId: refId }),
  z.object({ ...base, type: z.literal("timer_cancelled"), timerId: refId }),
  z.object({ ...base, type: z.literal("timer_acknowledged"), timerId: refId }),
  z.object({ ...base, type: z.literal("session_paused") }),
  z.object({ ...base, type: z.literal("session_resumed") }),
  z.object({
    ...base,
    type: z.literal("session_finished"),
    rating: z.number().int().min(1).max(5).optional(),
    note: z.string().max(2000).optional(),
  }),
]);

export const ingestBody = z.object({
  recipeId: z.uuid(),
  from: z.number().int().min(0).default(0),
  events: z.array(eventSchema).min(1).max(MAX_EVENTS_PER_REQUEST),
});

export type IngestBody = Omit<z.infer<typeof ingestBody>, "events"> & { events: PlayerEvent[] };
