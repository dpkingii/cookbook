-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "technique" AS ENUM ('chop', 'mince', 'slice', 'season', 'whisk', 'fold', 'knead', 'marinate', 'saute', 'sear', 'fry', 'boil', 'simmer', 'drain', 'roast', 'bake', 'broil', 'rest', 'chill', 'plate');

-- CreateEnum
CREATE TYPE "heat" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "timer_mode" AS ENUM ('stay', 'background');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "cuisine_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" "difficulty" NOT NULL,
    "prep_minutes" INTEGER NOT NULL,
    "cook_minutes" INTEGER NOT NULL,
    "servings" INTEGER NOT NULL,
    "image_url" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "note" TEXT,
    "token_shape" TEXT NOT NULL,
    "token_color" TEXT NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "technique" "technique" NOT NULL,
    "heat" "heat",
    "timer_seconds" INTEGER,
    "timer_mode" "timer_mode",
    "timer_label" TEXT,
    "cue" TEXT,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_ingredients" (
    "id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "portion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "note" TEXT,

    CONSTRAINT "step_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cooking_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "recipe_id" UUID,
    "recipe_snapshot" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "techniques" "technique"[],
    "cuisine_name" TEXT,
    "difficulty" "difficulty",
    "rating" INTEGER,
    "note" TEXT,

    CONSTRAINT "cooking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "step_index" INTEGER,
    "at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_recipes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_name_key" ON "cuisines"("name");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_position_idx" ON "recipe_ingredients"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "recipe_steps_recipe_id_position_idx" ON "recipe_steps"("recipe_id", "position");

-- CreateIndex
CREATE INDEX "step_ingredients_step_id_idx" ON "step_ingredients"("step_id");

-- CreateIndex
CREATE INDEX "step_ingredients_ingredient_id_idx" ON "step_ingredients"("ingredient_id");

-- CreateIndex
CREATE INDEX "cooking_sessions_user_id_finished_at_idx" ON "cooking_sessions"("user_id", "finished_at");

-- CreateIndex
CREATE INDEX "session_events_session_id_at_idx" ON "session_events"("session_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_recipes_user_id_recipe_id_key" ON "favorite_recipes"("user_id", "recipe_id");

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_cuisine_id_fkey" FOREIGN KEY ("cuisine_id") REFERENCES "cuisines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_ingredients" ADD CONSTRAINT "step_ingredients_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "recipe_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_ingredients" ADD CONSTRAINT "step_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "recipe_ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cooking_sessions" ADD CONSTRAINT "cooking_sessions_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "cooking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_recipes" ADD CONSTRAINT "favorite_recipes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_recipes" ADD CONSTRAINT "favorite_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
