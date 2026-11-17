import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lastWith, type PastCook } from "./past-cook";

process.env.DATABASE_URL = "postgresql://nickpeng@localhost:5432/cookbook_test";

const { prisma } = await import("@/lib/db/client");
const { listPastCooks } = await import("./past");

const reachable = await prisma.$queryRaw`select 1`.then(
  () => true,
  () => false,
);

const cook = (over: Partial<PastCook>): PastCook => ({ id: randomUUID(), when: "", rating: null, note: null, photoVersion: null, ...over });

describe("lastWith", () => {
  it("finds the most recent cook that has a note or a photo", () => {
    const cooks = [cook({ note: "old", photoVersion: 1 }), cook({ note: "new" }), cook({})];
    expect(lastWith(cooks, "note")?.note).toBe("new");
    expect(lastWith(cooks, "photoVersion")?.photoVersion).toBe(1);
    expect(lastWith([cook({})], "note")).toBeUndefined();
  });
});

describe.skipIf(!reachable)("listPastCooks", () => {
  const tag = `q${randomUUID().slice(0, 8)}`;
  let ownerId = "";
  let otherId = "";
  let recipeId = "";

  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { email: `${tag}-a@test.local`, username: `${tag}-a`, name: "A" } })).id;
    otherId = (await prisma.user.create({ data: { email: `${tag}-b@test.local`, username: `${tag}-b`, name: "B" } })).id;
    recipeId = (
      await prisma.recipe.create({ data: { title: tag, difficulty: "easy", prepMinutes: 1, cookMinutes: 1, servings: 1 } })
    ).id;
    const at = (iso: string) => new Date(iso);
    const session = (userId: string, finishedAt: Date | null, extra = {}) =>
      prisma.cookingSession.create({
        data: { userId, recipeId, recipeSnapshot: {}, startedAt: at("2026-01-01T00:00:00Z"), finishedAt, ...extra },
      });
    const second = await session(ownerId, at("2026-03-02T03:00:00Z"), { rating: 5, note: "Better" });
    await session(ownerId, at("2026-01-10T12:00:00Z"), { rating: 2 });
    await session(ownerId, null);
    await session(otherId, at("2026-02-01T12:00:00Z"));
    await prisma.sessionPhoto.create({ data: { sessionId: second.id, data: new Uint8Array([1]), width: 1, height: 1 } });
  });

  afterAll(async () => {
    const users = { in: [ownerId, otherId].filter(Boolean) };
    await prisma.cookingSession.deleteMany({ where: { userId: users } });
    await prisma.recipe.deleteMany({ where: { id: recipeId } });
    await prisma.user.deleteMany({ where: { id: users } });
    await prisma.$disconnect();
  });

  it("lists only the viewer's finished cooks of the recipe, oldest first, dated in their time zone", async () => {
    const cooks = await listPastCooks(ownerId, recipeId, "America/New_York");
    expect(cooks.map((c) => [c.when, c.rating, c.note, c.photoVersion !== null])).toEqual([
      ["Jan 10, 2026", 2, null, false],
      ["Mar 1, 2026", 5, "Better", true],
    ]);
    expect(await listPastCooks(ownerId, "not-a-uuid", "UTC")).toEqual([]);
  });
});
