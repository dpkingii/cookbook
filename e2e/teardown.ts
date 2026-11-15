import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Importing @prisma/client has already loaded .env, so .env.local must override it.
config({ path: ".env.local", override: true, quiet: true });

export default async function teardown() {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://unset").hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return;
  const prisma = new PrismaClient();
  await prisma.user.deleteMany({
    where: { OR: [{ email: { startsWith: "e2e-", endsWith: "@example.com" } }, { isAnonymous: true }] },
  });
  await prisma.$disconnect();
}
