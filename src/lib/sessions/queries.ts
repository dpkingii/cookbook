import type { CookingSession } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import type { PlayerEvent } from "@/lib/player";
import type { Recipe } from "@/lib/recipe/types";
import type { FinishedSession } from "@/lib/stats";
import { fromRow } from "./rows";

export const RESUME_WINDOW_MS = 12 * 60 * 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const eventOrder = [{ at: "asc" }, { seq: "asc" }] as const;

export async function getActiveSession(
  viewerId: string,
  recipeId: string,
  now = new Date(),
): Promise<{ sessionId: string; events: PlayerEvent[] } | null> {
  const row = await prisma.cookingSession.findFirst({
    where: {
      userId: viewerId,
      recipeId,
      finishedAt: null,
      startedAt: { gte: new Date(now.getTime() - RESUME_WINDOW_MS) },
    },
    orderBy: { startedAt: "desc" },
    include: { events: { orderBy: [...eventOrder] } },
  });
  return row ? { sessionId: row.id, events: row.events.map(fromRow) } : null;
}

export interface SessionEntry {
  id: string;
  recipeId: string | null;
  recipe: Recipe;
  startedAt: Date;
  finishedAt: Date | null;
  durationSeconds: number | null;
  techniques: CookingSession["techniques"];
  plausible: boolean;
  rating: number | null;
  note: string | null;
  /** When the dish photo was uploaded, or null if there is none. Part of the photo's address. */
  photoVersion: number | null;
}

/** Only the upload time, never the image itself. */
const photo = { select: { createdAt: true } } as const;

function toEntry(row: CookingSession & { photo: { createdAt: Date } | null }): SessionEntry {
  return {
    id: row.id,
    recipeId: row.recipeId,
    recipe: row.recipeSnapshot as unknown as Recipe,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    durationSeconds: row.durationSeconds,
    techniques: row.techniques,
    plausible: row.plausible,
    rating: row.rating,
    note: row.note,
    photoVersion: row.photo?.createdAt.getTime() ?? null,
  };
}

export async function listSessions(viewerId: string): Promise<SessionEntry[]> {
  const rows = await prisma.cookingSession.findMany({
    where: { userId: viewerId },
    orderBy: { startedAt: "desc" },
    include: { photo },
  });
  return rows.map(toEntry);
}

export async function getSessionDetail(viewerId: string, id: string) {
  if (!UUID.test(id)) return null;
  const row = await prisma.cookingSession.findFirst({
    where: { id, userId: viewerId },
    include: { events: { orderBy: [...eventOrder] }, photo },
  });
  return row ? { entry: toEntry(row), events: row.events.map(fromRow) } : null;
}

export function toFinished(entry: SessionEntry): FinishedSession | null {
  if (!entry.finishedAt) return null;
  const { recipe } = entry;
  return {
    id: entry.id,
    recipeId: entry.recipeId,
    title: recipe.title,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    finishedAt: entry.finishedAt,
    durationSeconds: entry.durationSeconds ?? 0,
    techniques: entry.techniques,
    plausible: entry.plausible,
    plannedMinutes: recipe.prepMinutes + recipe.cookMinutes,
  };
}

export async function listSessionGroups(viewerId: string) {
  const entries = await listSessions(viewerId);
  const cutoff = Date.now() - RESUME_WINDOW_MS;
  const open = entries.filter((e) => !e.finishedAt);
  return {
    total: entries.length,
    finished: entries
      .filter((e) => e.finishedAt)
      .sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime()),
    inProgress: open.filter((e) => e.startedAt.getTime() >= cutoff),
    abandoned: open.filter((e) => e.startedAt.getTime() < cutoff),
  };
}
