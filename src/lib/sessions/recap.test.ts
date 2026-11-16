import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import type { RecipeInput } from "@/lib/db/mapping";
import type { Recipe } from "@/lib/recipe/types";
import { simulateCook } from "./simulate";

process.env.DATABASE_URL = "postgresql://nickpeng@localhost:5432/cookbook_test";

let viewer: { id: string } | null = null;
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => viewer }));

const { prisma } = await import("@/lib/db/client");
const { createRecipe, getRecipe } = await import("@/lib/db/recipes");
const { ingestEvents } = await import("./ingest");
const { GET } = await import("@/app/api/sessions/[sessionId]/recap/route");

const reachable = await prisma.$queryRaw`select 1`.then(
  () => true,
  () => false,
);
if (!reachable) {
  console.warn("Skipping recap integration tests: cookbook_test is unreachable.");
}

const tag = `r${randomUUID().slice(0, 8)}`;
const seed = SEED_RECIPES.find((r) => r.steps.some((s) => s.timer))!;
const HOUR = 3_600_000;
const draft: Partial<Recipe> = { ...seed };
delete draft.id;

const call = (sessionId: string, query = "") =>
  GET(new Request(`http://test/api/sessions/${sessionId}/recap${query}`), { params: Promise.resolve({ sessionId }) });

describe.skipIf(!reachable)("recap route", () => {
  let ownerId = "";
  let otherId = "";
  let recipe: Recipe;
  const finishedId = randomUUID();
  const openId = randomUUID();
  const cleanup: string[] = [];

  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { email: `${tag}-a@test.local`, username: `${tag}-a`, name: "A" } })).id;
    otherId = (await prisma.user.create({ data: { email: `${tag}-b@test.local`, username: `${tag}-b`, name: "B" } })).id;
    const recipeId = await createRecipe({ ...(draft as RecipeInput), title: `${tag} ${seed.title}`, cuisine: `${tag}-Fusion`, isPublic: true }, ownerId);
    cleanup.push(recipeId);
    recipe = (await getRecipe(recipeId, ownerId))!;

    const send = (sessionId: string, events: ReturnType<typeof simulateCook>) =>
      ingestEvents({ viewerId: ownerId, sessionId, recipeId: recipe.id, from: 0, events });
    const cook = (startAt: number) => simulateCook(recipe, startAt, { makeId: randomUUID });
    await send(finishedId, cook(Date.now() - 3 * HOUR));
    await send(openId, cook(Date.now() - 2 * HOUR).slice(0, 4));
  });

  afterAll(async () => {
    const users = { in: [ownerId, otherId].filter(Boolean) };
    await prisma.cookingSession.deleteMany({ where: { userId: users } });
    await prisma.recipe.deleteMany({ where: { id: { in: cleanup } } });
    await prisma.user.deleteMany({ where: { id: users } });
    await prisma.cuisine.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("needs a signed-in viewer", async () => {
    viewer = null;
    expect((await call(finishedId)).status).toBe(401);
  });

  it("returns the recap to the owner", async () => {
    viewer = { id: ownerId };
    const response = await call(finishedId, "?tz=Europe/Paris");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session).toMatchObject({ id: finishedId, title: recipe.title, plausible: true });
    expect(body.session.minutes).toBeGreaterThan(0);
    expect(body.today.after).toBeGreaterThanOrEqual(body.session.minutes);
    expect(body.streak.days).toHaveLength(7);
    expect(body.techniques.items.length).toBeGreaterThan(0);
  });

  it("refuses another viewer's session", async () => {
    viewer = { id: otherId };
    const response = await call(finishedId);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Not your session" });
  });

  it("says 404 for sessions that do not exist and 409 for ones still being cooked", async () => {
    viewer = { id: ownerId };
    expect((await call(randomUUID())).status).toBe(404);
    expect((await call("not-a-uuid")).status).toBe(404);
    expect((await call(openId)).status).toBe(409);
  });

  it("rejects a time zone that is not an IANA name", async () => {
    viewer = { id: ownerId };
    expect((await call(finishedId, "?tz=Mars/Olympus")).status).toBe(400);
    expect((await call(finishedId)).status).toBe(200);
  });
});
