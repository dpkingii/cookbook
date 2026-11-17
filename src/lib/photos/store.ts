import { prisma } from "@/lib/db/client";
import { checkPhoto } from "./jpeg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PhotoFailure = "not_found" | "forbidden" | "too_large" | "not_jpeg";
export type SaveResult = { ok: true; version: number } | { ok: false; reason: PhotoFailure };

async function ownership(viewerId: string, sessionId: string): Promise<"ok" | "not_found" | "forbidden"> {
  if (!UUID.test(sessionId)) return "not_found";
  const row = await prisma.cookingSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!row) return "not_found";
  return row.userId === viewerId ? "ok" : "forbidden";
}

export async function savePhoto({
  viewerId,
  sessionId,
  bytes,
}: {
  viewerId: string;
  sessionId: string;
  bytes: Uint8Array<ArrayBuffer>;
}): Promise<SaveResult> {
  const checked = checkPhoto(bytes);
  if (!checked.ok) return checked;
  const owned = await ownership(viewerId, sessionId);
  if (owned !== "ok") return { ok: false, reason: owned };

  const fields = { data: bytes, width: checked.width, height: checked.height, createdAt: new Date() };
  const row = await prisma.sessionPhoto.upsert({
    where: { sessionId },
    create: { sessionId, ...fields },
    update: fields,
    select: { createdAt: true },
  });
  return { ok: true, version: row.createdAt.getTime() };
}

export async function getPhoto(viewerId: string, sessionId: string): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!UUID.test(sessionId)) return null;
  const row = await prisma.sessionPhoto.findFirst({
    where: { sessionId, session: { userId: viewerId } },
    select: { data: true },
  });
  return row ? new Uint8Array(row.data) : null;
}

export async function deletePhoto(viewerId: string, sessionId: string): Promise<boolean> {
  if (!UUID.test(sessionId)) return false;
  const { count } = await prisma.sessionPhoto.deleteMany({ where: { sessionId, session: { userId: viewerId } } });
  return count > 0;
}
