import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";
import { prisma } from "@/lib/db/client";

// On Vercel the site address comes from the platform, so only local development needs BETTER_AUTH_URL.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const deploymentHost = process.env.VERCEL_URL;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? (vercelHost ? `https://${vercelHost}` : undefined),
  trustedOrigins: [
    ...(deploymentHost ? [`https://${deploymentHost}`] : []),
    // The development server is not always on the port BETTER_AUTH_URL names.
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:*", "http://127.0.0.1:*"]),
  ],
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
