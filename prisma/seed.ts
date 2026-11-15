import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SEED_RECIPES } from "../src/lib/recipe/seed-recipes";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "demo@cookbook.local" },
    update: {},
    create: { email: "demo@cookbook.local", username: "demo", fullName: "Demo Cook" },
  });

  const cuisineIds = new Map<string, string>();
  for (const name of new Set(SEED_RECIPES.map((r) => r.cuisine))) {
    const cuisine = await prisma.cuisine.upsert({ where: { name }, update: {}, create: { name } });
    cuisineIds.set(name, cuisine.id);
  }

  await prisma.recipe.deleteMany({
    where: { userId: null, title: { in: SEED_RECIPES.map((r) => r.title) } },
  });

  for (const recipe of SEED_RECIPES) {
    const ingredientIds = new Map(recipe.ingredients.map((i) => [i.id, randomUUID()]));
    const stepIds = recipe.steps.map(() => randomUUID());

    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        difficulty: recipe.difficulty,
        prepMinutes: recipe.prepMinutes,
        cookMinutes: recipe.cookMinutes,
        servings: recipe.servings,
        isPublic: true,
        sourceName: recipe.source?.name,
        sourceUrl: recipe.source?.url,
        cuisineId: cuisineIds.get(recipe.cuisine),
        ingredients: {
          create: recipe.ingredients.map((ing, position) => ({
            id: ingredientIds.get(ing.id),
            position,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            note: ing.note,
            tokenShape: ing.token.shape,
            tokenColor: ing.token.color,
          })),
        },
        steps: {
          create: recipe.steps.map((step, position) => ({
            id: stepIds[position],
            position,
            text: step.text,
            technique: step.technique,
            heat: step.heat,
            timerSeconds: step.timer?.seconds,
            timerMode: step.timer?.mode,
            timerLabel: step.timer?.label,
            cue: step.cue,
          })),
        },
      },
    });

    await prisma.stepIngredient.createMany({
      data: recipe.steps.flatMap((step, i) =>
        step.uses.map((use) => {
          const ingredientId = ingredientIds.get(use.ingredientId);
          if (!ingredientId) {
            throw new Error(`${recipe.title}: step ${i + 1} uses unknown ingredient "${use.ingredientId}"`);
          }
          return { stepId: stepIds[i], ingredientId, portion: use.portion ?? 1, note: use.note };
        }),
      ),
    });

    console.log(`Seeded ${recipe.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
