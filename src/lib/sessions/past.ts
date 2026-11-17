import { prisma } from "@/lib/db/client";
import { formatDate } from "@/components/stats/format";
import type { PastCook } from "./past-cook";

export type { PastCook } from "./past-cook";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Oldest first, so a row of them reads as progress from left to right. */
export async function listPastCooks(viewerId: string, recipeId: string, tz: string): Promise<PastCook[]> {
  if (!UUID.test(recipeId)) return [];
  const rows = await prisma.cookingSession.findMany({
    where: { userId: viewerId, recipeId, finishedAt: { not: null } },
    orderBy: { finishedAt: "asc" },
    select: { id: true, finishedAt: true, rating: true, note: true, photo: { select: { createdAt: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    when: formatDate(row.finishedAt!, tz),
    rating: row.rating,
    note: row.note,
    photoVersion: row.photo?.createdAt.getTime() ?? null,
  }));
}
