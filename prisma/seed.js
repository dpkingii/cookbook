import pkg from "@prisma/client";
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  log: ["warn", "error"],
});

async function main() {
  console.log("🌱 Seeding CookTrack database...");

  // 1️⃣ Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@cooktrack.dev" },
    update: {},
    create: {
      email: "test@cooktrack.dev",
      username: "testchef",
      passwordHash: "dev_only_password_hash",
      fullName: "Test Chef",
      avatarUrl: "https://i.pravatar.cc/150?img=3",
    },
  });

  // 2️⃣ Create ingredients
  const pasta = await prisma.ingredient.upsert({
    where: { name: "Pasta" },
    update: {},
    create: { name: "Pasta" },
  });

  const salt = await prisma.ingredient.upsert({
    where: { name: "Salt" },
    update: {},
    create: { name: "Salt" },
  });

  const oliveOil = await prisma.ingredient.upsert({
    where: { name: "Olive Oil" },
    update: {},
    create: { name: "Olive Oil" },
  });

  // 3️⃣ Create a recipe
  const recipe = await prisma.recipe.create({
    data: {
      title: "Simple Pasta",
      description: "A beginner-friendly pasta recipe",
      difficultyLevel: "beginner",
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      servings: 2,
      isPublic: true,
      userId: user.id,
    },
  });

  // 4️⃣ Attach ingredients to recipe
  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: recipe.id,
        ingredientId: pasta.id,
        amount: 200,
        unit: "grams",
        order: 1,
      },
      {
        recipeId: recipe.id,
        ingredientId: salt.id,
        amount: 1,
        unit: "tsp",
        order: 2,
      },
      {
        recipeId: recipe.id,
        ingredientId: oliveOil.id,
        amount: 1,
        unit: "tbsp",
        order: 3,
      },
    ],
  });

  // 5️⃣ Create recipe steps
  const step1 = await prisma.recipeStep.create({
    data: {
      recipeId: recipe.id,
      stepNumber: 1,
      instruction: "Boil water and add salt.",
      durationMinutes: 5,
    },
  });

  const step2 = await prisma.recipeStep.create({
    data: {
      recipeId: recipe.id,
      stepNumber: 2,
      instruction: "Cook pasta until al dente.",
      durationMinutes: 8,
    },
  });

  // 6️⃣ Create a cooking session
  const session = await prisma.cookingSession.create({
    data: {
      userId: user.id,
      recipeId: recipe.id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      completedAt: new Date(),
      totalTimeMinutes: 13,
      difficultyRating: 2,
    },
  });

  // 7️⃣ Mark steps as completed
  await prisma.sessionStepProgress.createMany({
    data: [
      {
        sessionId: session.id,
        stepId: step1.id,
        isCompleted: true,
        completedAt: new Date(),
      },
      {
        sessionId: session.id,
        stepId: step2.id,
        isCompleted: true,
        completedAt: new Date(),
      },
    ],
  });

  // 8️⃣ Create cuisine skill progress
  await prisma.userCuisineSkill.create({
    data: {
      userId: user.id,
      cuisineType: "Italian",
      experiencePoints: 120,
      level: 2,
      recipesCooked: 1,
      lastCookedAt: new Date(),
    },
  });

  // 9️⃣ Favorite the recipe
  await prisma.favoriteRecipe.create({
    data: {
      userId: user.id,
      recipeId: recipe.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log({
    user: user.email,
    recipe: recipe.title,
    session: session.id,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
