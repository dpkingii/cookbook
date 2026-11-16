import { prisma } from "@/lib/db/client";
import { listRecipes } from "@/lib/db/recipes";
import { buildRecap, type Recap } from "@/lib/stats/recap";
import type { FinishedSession } from "@/lib/stats";
import { listSessions, toFinished } from "./queries";

export type RecapResult = { ok: true; recap: Recap } | { ok: false; reason: "not_found" | "forbidden" | "unfinished" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getRecap({
  viewerId,
  sessionId,
  tz,
}: {
  viewerId: string;
  sessionId: string;
  tz: string;
}): Promise<RecapResult> {
  if (!UUID.test(sessionId)) return { ok: false, reason: "not_found" };
  const row = await prisma.cookingSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, finishedAt: true },
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.userId !== viewerId) return { ok: false, reason: "forbidden" };
  if (!row.finishedAt) return { ok: false, reason: "unfinished" };

  const [entries, catalogue] = await Promise.all([listSessions(viewerId), listRecipes({ viewerId })]);
  const finished = entries.map(toFinished).filter((s): s is FinishedSession => s !== null);
  const recap = buildRecap({ sessions: finished, sessionId, tz, catalogue });
  return recap ? { ok: true, recap } : { ok: false, reason: "not_found" };
}
