import type { Prisma, SessionEvent } from "@prisma/client";
import type { PlayerEvent } from "@/lib/player";

export function toRow(sessionId: string, event: PlayerEvent, seq: number): Prisma.SessionEventCreateManyInput {
  const { id, type, at, ...rest } = event;
  const { stepIndex, ...payload } = rest as typeof rest & { stepIndex?: number };
  return {
    id,
    sessionId,
    type,
    stepIndex: stepIndex ?? null,
    at: new Date(at),
    seq,
    payload: Object.keys(payload).length > 0 ? (payload as Prisma.InputJsonObject) : undefined,
  };
}

export function fromRow(row: Pick<SessionEvent, "id" | "type" | "stepIndex" | "at" | "payload">): PlayerEvent {
  return {
    ...(row.payload as object | null),
    ...(row.stepIndex === null ? {} : { stepIndex: row.stepIndex }),
    id: row.id,
    type: row.type,
    at: row.at.getTime(),
  } as PlayerEvent;
}
