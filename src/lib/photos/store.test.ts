import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "postgresql://nickpeng@localhost:5432/cookbook_test";

const { prisma } = await import("@/lib/db/client");
const { deletePhoto, getPhoto, savePhoto } = await import("./store");
const { getSessionDetail, listSessions } = await import("@/lib/sessions/queries");

const reachable = await prisma.$queryRaw`select 1`.then(
  () => true,
  () => false,
);
if (!reachable) console.warn("Skipping photo integration tests: cookbook_test is unreachable.");

const tag = `p${randomUUID().slice(0, 8)}`;
const jpeg = (width: number, height: number, padding = 0) =>
  Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0, 11, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x11, 0,
    ...new Array<number>(padding).fill(7),
    0xff, 0xd9,
  ]);

describe.skipIf(!reachable)("dish photos", () => {
  let ownerId = "";
  let otherId = "";
  const sessionId = randomUUID();

  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { email: `${tag}-a@test.local`, username: `${tag}-a`, name: "A" } })).id;
    otherId = (await prisma.user.create({ data: { email: `${tag}-b@test.local`, username: `${tag}-b`, name: "B" } })).id;
    await prisma.cookingSession.create({
      data: { id: sessionId, userId: ownerId, recipeSnapshot: { title: "Test" }, startedAt: new Date(), finishedAt: new Date() },
    });
  });

  afterAll(async () => {
    const users = { in: [ownerId, otherId].filter(Boolean) };
    await prisma.cookingSession.deleteMany({ where: { userId: users } });
    await prisma.user.deleteMany({ where: { id: users } });
    await prisma.$disconnect();
  });

  it("refuses a photo for someone else's session, a missing session, or a file that is not a JPEG", async () => {
    expect(await savePhoto({ viewerId: otherId, sessionId, bytes: jpeg(800, 600) })).toEqual({ ok: false, reason: "forbidden" });
    expect(await savePhoto({ viewerId: ownerId, sessionId: randomUUID(), bytes: jpeg(800, 600) })).toEqual({ ok: false, reason: "not_found" });
    expect(await savePhoto({ viewerId: ownerId, sessionId, bytes: new Uint8Array([1, 2, 3]) })).toEqual({ ok: false, reason: "not_jpeg" });
    expect(await getPhoto(ownerId, sessionId)).toBeNull();
    expect((await listSessions(ownerId))[0].photoVersion).toBeNull();
  });

  it("saves the photo, shows it only to its owner, and lists it with the session", async () => {
    const bytes = jpeg(800, 600, 40);
    const saved = await savePhoto({ viewerId: ownerId, sessionId, bytes });
    expect(saved.ok).toBe(true);
    expect(await getPhoto(ownerId, sessionId)).toEqual(bytes);
    expect(await getPhoto(otherId, sessionId)).toBeNull();
    expect(await prisma.sessionPhoto.findUnique({ where: { sessionId }, select: { width: true, height: true } })).toEqual({ width: 800, height: 600 });

    const version = saved.ok && saved.version;
    expect((await listSessions(ownerId))[0].photoVersion).toBe(version);
    expect((await getSessionDetail(ownerId, sessionId))?.entry.photoVersion).toBe(version);
  });

  it("replaces the photo and gives it a new version", async () => {
    const before = (await listSessions(ownerId))[0].photoVersion!;
    await new Promise((r) => setTimeout(r, 5));
    const bytes = jpeg(640, 480);
    const saved = await savePhoto({ viewerId: ownerId, sessionId, bytes });
    expect(saved.ok && saved.version).toBeGreaterThan(before);
    expect(await getPhoto(ownerId, sessionId)).toEqual(bytes);
    expect(await prisma.sessionPhoto.count({ where: { sessionId } })).toBe(1);
  });

  it("only the owner can remove it, and it goes when the session is deleted", async () => {
    expect(await deletePhoto(otherId, sessionId)).toBe(false);
    expect(await deletePhoto(ownerId, sessionId)).toBe(true);
    expect(await getPhoto(ownerId, sessionId)).toBeNull();

    await savePhoto({ viewerId: ownerId, sessionId, bytes: jpeg(640, 480) });
    await prisma.cookingSession.delete({ where: { id: sessionId } });
    expect(await prisma.sessionPhoto.count({ where: { sessionId } })).toBe(0);
  });
});
