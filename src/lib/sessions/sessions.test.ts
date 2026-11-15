import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { summary, replay } from "@/lib/player";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import type { RecipeInput } from "@/lib/db/mapping";
import type { Recipe } from "@/lib/recipe/types";
import { ingestBody, MAX_EVENTS_PER_REQUEST } from "./schema";
import { simulateCook } from "./simulate";
import { buildTimeline } from "./timeline";

process.env.DATABASE_URL = "postgresql://nickpeng@localhost:5432/cookbook_test";

const { prisma } = await import("@/lib/db/client");
const { createRecipe, getRecipe } = await import("@/lib/db/recipes");
const { ingestEvents } = await import("./ingest");
const { getActiveSession, getSessionDetail, listSessions } = await import("./queries");

const reachable = await prisma.$queryRaw`select 1`.then(
  () => true,
  () => false,
);
if (!reachable) {
  console.warn("Skipping session integration tests: cookbook_test is unreachable.");
}

const tag = `s${randomUUID().slice(0, 8)}`;
const seed = SEED_RECIPES.find((r) => r.steps.some((s) => s.timer))!;
const HOUR = 3_600_000;
const draft: Partial<Recipe> = { ...seed };
delete draft.id;

const cook = (recipe: Recipe, startAt: number, opts: { walkthrough?: boolean; rating?: number; note?: string } = {}) =>
  simulateCook(recipe, startAt, { makeId: randomUUID, ...opts });

describe("simulated cook", () => {
  it("is a valid, plausible full session that the schema accepts", () => {
    const events = cook(seed, Date.now() - 3 * HOUR, { rating: 4, note: "Good" });
    expect(ingestBody.safeParse({ recipeId: randomUUID(), events }).success).toBe(true);
    const state = replay(seed, events);
    expect(state.phase).toBe("finished");
    expect(summary(state, seed)).toMatchObject({ plausible: true, completedSteps: seed.steps.length });
  });
});

describe("ingest body schema", () => {
  const event = { id: randomUUID(), type: "session_started", at: Date.now() - 1000 };
  const parse = (body: object) => ingestBody.safeParse({ recipeId: randomUUID(), ...body });

  it("accepts up to the cap and rejects more", () => {
    const many = (n: number) => Array.from({ length: n }, () => ({ ...event, id: randomUUID() }));
    expect(parse({ events: many(MAX_EVENTS_PER_REQUEST) }).success).toBe(true);
    expect(parse({ events: many(MAX_EVENTS_PER_REQUEST + 1) }).success).toBe(false);
    expect(parse({ events: [] }).success).toBe(false);
  });

  it("rejects unknown types, bad ids, bad ratings and timestamps from the future", () => {
    expect(parse({ events: [{ ...event, type: "teleport" }] }).success).toBe(false);
    expect(parse({ events: [{ ...event, id: "nope" }] }).success).toBe(false);
    expect(parse({ events: [{ ...event, type: "session_finished", rating: 9 }] }).success).toBe(false);
    expect(parse({ events: [{ ...event, at: Date.now() + 24 * HOUR }] }).success).toBe(false);
  });

  it("drops fields it does not know about", () => {
    const parsed = parse({ events: [{ ...event, durationSeconds: 1 }] });
    expect(parsed.success && parsed.data.events[0]).not.toHaveProperty("durationSeconds");
  });
});

describe("timeline", () => {
  it("credits time to the step on screen, not while paused", () => {
    const events = cook(seed, 1_700_000_000_000);
    const timeline = buildTimeline(seed, events);
    expect(timeline.finished).toBe(true);
    expect(timeline.steps.every((s) => s.completed && s.reached)).toBe(true);
    seed.steps.forEach((step, i) => {
      const expected = 25 + (step.timer?.seconds ?? 0);
      expect(timeline.steps[i].spentSeconds).toBeGreaterThanOrEqual(expected);
      expect(timeline.steps[i].spentSeconds).toBeLessThanOrEqual(expected + 12);
    });
    const withTimers = seed.steps.filter((s) => s.timer).length;
    expect(timeline.timers).toHaveLength(withTimers);
    expect(timeline.timers.every((t) => t.outcome === "rang" && t.endedOffset! > t.startedOffset)).toBe(true);
  });
});

describe.skipIf(!reachable)("session ingestion", () => {
  let ownerId = "";
  let otherId = "";
  let recipe: Recipe;
  const cleanup: string[] = [];

  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { email: `${tag}-a@test.local`, username: `${tag}-a`, name: "A" } })).id;
    otherId = (await prisma.user.create({ data: { email: `${tag}-b@test.local`, username: `${tag}-b`, name: "B" } })).id;
    const recipeId = await createRecipe({ ...(draft as RecipeInput), title: `${tag} ${seed.title}`, cuisine: `${tag}-Fusion`, isPublic: true }, ownerId);
    cleanup.push(recipeId);
    recipe = (await getRecipe(recipeId, ownerId))!;
  });

  afterAll(async () => {
    const users = { in: [ownerId, otherId].filter(Boolean) };
    await prisma.cookingSession.deleteMany({ where: { userId: users } });
    await prisma.recipe.deleteMany({ where: { id: { in: cleanup } } });
    await prisma.user.deleteMany({ where: { id: users } });
    await prisma.cuisine.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  const send = (sessionId: string, events: ReturnType<typeof cook>, from = 0, viewerId = ownerId, recipeId = recipe.id) =>
    ingestEvents({ viewerId, sessionId, recipeId, from, events });

  it("stores a snapshot and is idempotent when the same batch arrives twice", async () => {
    const sessionId = randomUUID();
    const events = cook(recipe, Date.now() - 5 * HOUR).slice(0, 12);

    expect(await send(sessionId, events)).toEqual({ ok: true, finished: false });
    const first = await prisma.sessionEvent.findMany({ where: { sessionId }, orderBy: [{ at: "asc" }, { seq: "asc" }] });
    expect(await send(sessionId, events)).toEqual({ ok: true, finished: false });
    const second = await prisma.sessionEvent.findMany({ where: { sessionId }, orderBy: [{ at: "asc" }, { seq: "asc" }] });

    expect(first).toHaveLength(12);
    expect(second).toEqual(first);
    expect(await prisma.cookingSession.count({ where: { id: sessionId } })).toBe(1);
    const row = await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(row).toMatchObject({ userId: ownerId, recipeId: recipe.id, finishedAt: null, durationSeconds: null });
    expect((row.recipeSnapshot as { title: string }).title).toBe(recipe.title);
  });

  it("keeps the snapshot when the recipe is edited or deleted later", async () => {
    const own = await createRecipe(
      { ...(draft as RecipeInput), title: `${tag} short-lived`, cuisine: `${tag}-Fusion`, isPublic: true },
      ownerId,
    );
    const sessionId = randomUUID();
    await send(sessionId, cook(recipe, Date.now() - 4 * HOUR).slice(0, 3), 0, ownerId, own);
    await prisma.recipe.delete({ where: { id: own } });

    const row = await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(row.recipeId).toBeNull();
    expect((row.recipeSnapshot as { title: string }).title).toBe(`${tag} short-lived`);
  });

  it("writes the summary when the session finishes and recomputes it from the events", async () => {
    const sessionId = randomUUID();
    const events = cook(recipe, Date.now() - 6 * HOUR, { rating: 5, note: "Salt more" });
    const state = replay(recipe, events);
    const expected = summary(state, recipe);

    expect(await send(sessionId, events.slice(0, -1))).toMatchObject({ finished: false });
    expect((await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } })).finishedAt).toBeNull();

    expect(await send(sessionId, events.slice(-1), events.length - 1)).toEqual({ ok: true, finished: true });
    const row = await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(row).toMatchObject({
      finishedAt: new Date(state.finishedAt!),
      startedAt: new Date(state.startedAt!),
      durationSeconds: expected.durationSeconds,
      cuisineName: recipe.cuisine,
      difficulty: recipe.difficulty,
      rating: 5,
      note: "Salt more",
      plausible: true,
    });
    expect([...row.techniques].sort()).toEqual([...expected.techniques].sort());
    expect(row.techniques.length).toBeGreaterThan(0);
  });

  it("settles to the same summary however the batches are split or ordered", async () => {
    const events = cook(recipe, Date.now() - 7 * HOUR);
    const whole = randomUUID();
    const reversed = randomUUID();
    await send(whole, events);
    const cut = Math.floor(events.length / 2);
    const copy = events.map((e) => ({ ...e, id: randomUUID() }));
    await send(reversed, copy.slice(cut), cut);
    await send(reversed, copy.slice(0, cut), 0);

    const pick = async (id: string) => {
      const { finishedAt, durationSeconds, techniques, plausible } = await prisma.cookingSession.findUniqueOrThrow({ where: { id } });
      return { finishedAt, durationSeconds, techniques, plausible };
    };
    expect(await pick(reversed)).toEqual(await pick(whole));
    expect((await pick(whole)).finishedAt).not.toBeNull();
  });

  it("flags a tap-through as not plausible", async () => {
    const sessionId = randomUUID();
    await send(sessionId, cook(recipe, Date.now() - 8 * HOUR, { walkthrough: true }));
    const row = await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(row.finishedAt).not.toBeNull();
    expect(row.plausible).toBe(false);
  });

  it("refuses to write into someone else's session", async () => {
    const sessionId = randomUUID();
    const events = cook(recipe, Date.now() - 9 * HOUR);
    await send(sessionId, events.slice(0, 5));

    expect(await send(sessionId, events.slice(5), 5, otherId)).toEqual({ ok: false, reason: "forbidden" });
    expect(await prisma.sessionEvent.count({ where: { sessionId } })).toBe(5);
    expect((await prisma.cookingSession.findUniqueOrThrow({ where: { id: sessionId } })).userId).toBe(ownerId);
  });

  it("does not create a session for a recipe the viewer cannot see", async () => {
    const sessionId = randomUUID();
    const result = await send(sessionId, cook(recipe, Date.now() - HOUR).slice(0, 1), 0, ownerId, randomUUID());
    expect(result).toEqual({ ok: false, reason: "recipe_not_found" });
    expect(await prisma.cookingSession.count({ where: { id: sessionId } })).toBe(0);
  });

  describe("resume", () => {
    beforeEach(async () => {
      await prisma.cookingSession.deleteMany({ where: { userId: ownerId } });
    });

    it("returns the most recent unfinished session for the recipe, events in order", async () => {
      const older = randomUUID();
      const newer = randomUUID();
      const olderEvents = cook(recipe, Date.now() - 5 * HOUR).slice(0, 4);
      const newerEvents = cook(recipe, Date.now() - 2 * HOUR).slice(0, 20);
      await send(older, olderEvents);
      await send(newer, newerEvents);

      expect(await getActiveSession(ownerId, recipe.id)).toEqual({ sessionId: newer, events: newerEvents });
    });

    it("skips finished sessions, other cooks and other recipes", async () => {
      const finished = randomUUID();
      await send(finished, cook(recipe, Date.now() - 10 * HOUR));
      const open = randomUUID();
      await send(open, cook(recipe, Date.now() - 3 * HOUR).slice(0, 2));

      expect((await getActiveSession(ownerId, recipe.id))?.sessionId).toBe(open);
      expect(await getActiveSession(otherId, recipe.id)).toBeNull();
      expect(await getActiveSession(ownerId, randomUUID())).toBeNull();
    });

    it("ignores sessions started more than 12 hours ago", async () => {
      const stale = randomUUID();
      await send(stale, cook(recipe, Date.now() - 20 * HOUR).slice(0, 2));
      const later = new Date(Date.now() + 100 * HOUR);
      expect(await getActiveSession(ownerId, recipe.id, later)).toBeNull();
    });
  });

  it("lists a viewer's sessions and loads one only for its owner", async () => {
    const sessionId = randomUUID();
    await send(sessionId, cook(recipe, Date.now() - 11 * HOUR));

    expect((await listSessions(ownerId)).map((s) => s.id)).toContain(sessionId);
    expect((await listSessions(otherId)).map((s) => s.id)).not.toContain(sessionId);

    const detail = await getSessionDetail(ownerId, sessionId);
    expect(detail?.entry.recipe.title).toBe(recipe.title);
    expect(detail?.events.length).toBeGreaterThan(10);
    expect(await getSessionDetail(otherId, sessionId)).toBeNull();
    expect(await getSessionDetail(ownerId, "not-a-uuid")).toBeNull();
  });
});
