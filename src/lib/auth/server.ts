import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { prisma } from "@/lib/db/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: { database: { generateId: "uuid" } },
  session: { modelName: "authSession" },
  emailAndPassword: { enabled: true },
  plugins: [
    anonymous({
      generateName: () => "Guest",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const from = anonymousUser.user.id;
        const to = newUser.user.id;
        await prisma.$transaction(async (tx) => {
          await tx.cookingSession.updateMany({ where: { userId: from }, data: { userId: to } });
          await tx.recipe.updateMany({ where: { userId: from }, data: { userId: to } });
          const favorites = await tx.favoriteRecipe.findMany({ where: { userId: from } });
          await tx.favoriteRecipe.createMany({
            data: favorites.map((f) => ({ userId: to, recipeId: f.recipeId, createdAt: f.createdAt })),
            skipDuplicates: true,
          });
          await tx.favoriteRecipe.deleteMany({ where: { userId: from } });
        });
      },
    }),
    nextCookies(),
  ],
});
