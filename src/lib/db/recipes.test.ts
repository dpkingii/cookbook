import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SEED_RECIPES } from "@/lib/recipe/seed-recipes";
import type { Recipe } from "@/lib/recipe/types";
import type { RecipeInput, StoredRecipe } from "./mapping";

process.env.DATABASE_URL = "postgresql://nickpeng@localhost:5432/cookbook_test";

const { prisma } = await import("./client");
const db = await import("./recipes");

const reachable = await prisma.$queryRaw`select 1`.then(
  () => true,
  () => false,
);
if (!reachable) {
  console.warn("Skipping DB integration tests: cookbook_test is unreachable (createdb cookbook_test && prisma db push).");
}

const tag = `t${randomUUID().slice(0, 8)}`;
const ownerEmail = `${tag}-owner@test.local`;
const otherEmail = `${tag}-other@test.local`;
let ownerId = "";
let otherId = "";

const base: RecipeInput = {
  title: `${tag} Lemon Toast`,
  description: "Bread, but brighter.",
  cuisine: `${tag}-Fusion`,
  difficulty: "easy",
  servings: 2,
  prepMinutes: 2,
  cookMinutes: 4,
  ingredients: [
    { id: "bread", name: `${tag}Sourdough`, quantity: 2, unit: "slice", token: { shape: "cube", color: "#d9a066" } },
    { id: "lemon", name: "lemon zest", quantity: null, unit: null, note: "fine", token: { shape: "wedge", color: "#f2d544" } },
  ],
  steps: [
    {
      text: "Toast the bread.",
      technique: "broil",
      heat: "high",
      timer: { seconds: 120, mode: "stay", label: "Toasting" },
      cue: "Golden edges",
      uses: [{ ingredientId: "bread" }],
    },
    { text: "Zest over the top.", technique: "plate", uses: [{ ingredientId: "lemon", portion: 0.5, note: "light" }] },
  ],
};

function normalise(stored: Recipe | StoredRecipe) {
  const recipe: Recipe = {
    id: "",
    title: stored.title,
    description: stored.description,
    cuisine: stored.cuisine,
    difficulty: stored.difficulty,
    servings: stored.servings,
    prepMinutes: stored.prepMinutes,
    cookMinutes: stored.cookMinutes,
    source: stored.source,
    ingredients: stored.ingredients,
    steps: stored.steps,
  };
  const ids = new Map(recipe.ingredients.map((ing, i) => [ing.id, `ing${i}`]));
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => ({ ...ing, id: ids.get(ing.id) })),
    steps: recipe.steps.map((step) => ({
      ...step,
      uses: step.uses.map((use) => ({
        ingredientId: ids.get(use.ingredientId),
        note: use.note,
        ...(use.portion !== undefined && use.portion !== 1 && { portion: use.portion }),
      })),
    })),
  };
}

describe.skipIf(!reachable)("recipes database", () => {
  const created: string[] = [];

  async function make(overrides: Partial<RecipeInput> = {}, owner = ownerId) {
    const id = await db.createRecipe({ ...base, ...overrides }, owner);
    created.push(id);
    return id;
  }

  beforeAll(async () => {
    ownerId = (await prisma.user.create({ data: { email: ownerEmail, username: `${tag}-owner`, name: "Owner" } })).id;
    otherId = (await prisma.user.create({ data: { email: otherEmail, username: `${tag}-other`, name: "Other" } })).id;
  });

  afterAll(async () => {
    const users = { in: [ownerId, otherId].filter(Boolean) };
    await prisma.recipe.deleteMany({ where: { OR: [{ id: { in: created } }, { userId: users }] } });
    await prisma.user.deleteMany({ where: { id: users } });
    await prisma.cuisine.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("round-trips a created recipe", async () => {
    const id = await make();
    const stored = await db.getRecipe(id, ownerId);
    expect(stored).toMatchObject({ id, ownerId, isPublic: false, favorited: false });
    expect(stored!.createdAt).toBeInstanceOf(Date);
    expect(stored!.ingredients.map((i) => i.id)).not.toContain("bread");
    expect(normalise(stored!)).toEqual(normalise({ ...base, id }));
  });

  it("round-trips every seed recipe losslessly", async () => {
    for (const seed of SEED_RECIPES) {
      const input: Partial<Recipe> = { ...seed };
      delete input.id;
      const id = await make({ ...(input as RecipeInput), title: `${tag} ${seed.title}`, cuisine: `${tag}-${seed.cuisine}` });
      const stored = await db.getRecipe(id, ownerId);
      expect(normalise({ ...stored!, title: seed.title, cuisine: seed.cuisine }), seed.title).toEqual(
        normalise(seed),
      );
    }
  });

  it("hides private recipes from everyone but the owner", async () => {
    const id = await make();
    expect(await db.getRecipe(id, null)).toBeNull();
    expect(await db.getRecipe(id, otherId)).toBeNull();
    expect(await db.getRecipe(id, ownerId)).not.toBeNull();
  });

  it("returns null for missing and non-uuid ids", async () => {
    expect(await db.getRecipe(randomUUID(), null)).toBeNull();
    expect(await db.getRecipe("not-a-uuid", null)).toBeNull();
  });

  it("lists the catalogue as public plus the viewer's own", async () => {
    const pub = await make({ title: `${tag} public`, isPublic: true });
    const priv = await make({ title: `${tag} private` });
    const ids = async (viewerId: string | null) =>
      (await db.listRecipes({ viewerId, q: tag })).map((r) => r.id);

    expect(await ids(null)).toContain(pub);
    expect(await ids(null)).not.toContain(priv);
    expect(await ids(otherId)).not.toContain(priv);
    expect(await ids(ownerId)).toEqual(expect.arrayContaining([pub, priv]));
  });

  it("filters by scope, cuisine, difficulty and query", async () => {
    const mark = `${tag}filter`;
    const hard = await make({ title: `${mark} hard`, difficulty: "hard", cuisine: `${mark}-Other` });
    const easy = await make({ title: `${mark} easy`, difficulty: "easy" });
    const list = async (opts: Omit<Parameters<typeof db.listRecipes>[0], "viewerId">) =>
      (await db.listRecipes({ viewerId: ownerId, ...opts })).map((r) => r.id);

    expect(await list({ scope: "mine", q: mark })).toEqual(expect.arrayContaining([hard, easy]));
    expect(await db.listRecipes({ viewerId: null, scope: "mine" })).toEqual([]);
    expect(await list({ difficulty: "hard", q: mark })).toEqual([hard]);
    expect(await list({ cuisine: `${mark}-Other` })).toEqual([hard]);
    expect(await list({ q: mark.toUpperCase() })).toHaveLength(2);
    expect(await list({ q: `${mark}-no-match` })).toEqual([]);
  });

  it("matches the query against ingredient names, case-insensitively", async () => {
    const id = await make({ title: `${tag} plain` });
    const found = await db.listRecipes({ viewerId: ownerId, q: `${tag}SOURDOUGH` });
    expect(found.map((r) => r.id)).toContain(id);
  });

  it("toggles favourites and lists them", async () => {
    const id = await make({ isPublic: true });
    await db.setFavorite(id, otherId, true);
    await db.setFavorite(id, otherId, true);

    expect((await db.getRecipe(id, otherId))!.favorited).toBe(true);
    expect((await db.getRecipe(id, ownerId))!.favorited).toBe(false);
    expect((await db.listRecipes({ viewerId: otherId, scope: "favorites" })).map((r) => r.id)).toEqual([id]);
    expect(await db.listRecipes({ viewerId: null, scope: "favorites" })).toEqual([]);

    await db.setFavorite(id, otherId, false);
    expect(await db.listRecipes({ viewerId: otherId, scope: "favorites" })).toEqual([]);
  });

  it("updates in place, replacing ingredients and steps", async () => {
    const id = await make();
    const next: RecipeInput = {
      ...base,
      title: `${tag} Updated`,
      isPublic: true,
      cuisine: `${tag}-Brand New`,
      ingredients: [base.ingredients[0]],
      steps: [{ text: "Just toast.", technique: "broil", uses: [{ ingredientId: "bread" }] }],
    };

    expect(await db.updateRecipe(id, next, ownerId)).toBe(true);
    const stored = (await db.getRecipe(id, null))!;
    expect(stored).toMatchObject({ title: `${tag} Updated`, isPublic: true, cuisine: `${tag}-Brand New` });
    expect(stored.ingredients).toHaveLength(1);
    expect(stored.steps).toHaveLength(1);
    expect(stored.steps[0].uses[0].ingredientId).toBe(stored.ingredients[0].id);
    expect(await prisma.recipeStep.count({ where: { recipeId: id } })).toBe(1);
  });

  it("refuses to update or delete someone else's recipe", async () => {
    const id = await make();
    expect(await db.updateRecipe(id, { ...base, title: "Hijack" }, otherId)).toBe(false);
    expect(await db.deleteRecipe(id, otherId)).toBe(false);
    expect((await db.getRecipe(id, ownerId))!.title).toBe(base.title);
  });

  it("leaves the recipe untouched when an update is invalid", async () => {
    const id = await make();
    await expect(db.updateRecipe(id, { ...base, steps: [] }, ownerId)).rejects.toThrow(/at least one step/);
    expect((await db.getRecipe(id, ownerId))!.steps).toHaveLength(2);
  });

  it("deletes owned recipes along with their rows", async () => {
    const id = await make();
    expect(await db.deleteRecipe(id, ownerId)).toBe(true);
    expect(await db.getRecipe(id, ownerId)).toBeNull();
    expect(await prisma.recipeIngredient.count({ where: { recipeId: id } })).toBe(0);
    expect(await db.deleteRecipe(id, ownerId)).toBe(false);
  });

  it("lists cuisines that have public recipes", async () => {
    await make({ cuisine: `${tag}-Hidden` });
    await make({ cuisine: `${tag}-Shown`, isPublic: true });
    const cuisines = await db.listCuisines();
    expect(cuisines).toContain(`${tag}-Shown`);
    expect(cuisines).not.toContain(`${tag}-Hidden`);
  });
});
