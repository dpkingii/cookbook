# Cookbook — revised plan

Revised 2026-11-14. Replaces the 4-week "CookTrack" plan.

## What this is

A cookbook where every recipe is something you **play**, not read. Cooking mode puts one step on screen at a time, with an animation that shows the motion, the heat and what "done" looks like, and timers that keep running while you move on. Everything else in the app (building recipes, history, skill tracking) exists to feed the player or is a byproduct of it.

The base plan gave cooking mode 2 of 28 days and described it as checkboxes plus a timer. It never mentioned animation. This plan makes the player the product and builds it first.

## What changed, and why

| Base plan | Now | Why |
|---|---|---|
| Week 1 is auth and a UI shell; cooking mode arrives in week 3 | The player is milestone 1, on one hardcoded recipe, with no database or login | The riskiest and most distinctive part gets proven first. Auth is a solved problem and can wait. |
| A step is a sentence and an optional duration | A step is structured: technique, station, heat, timer, doneness cue, ingredients used | Animation needs data to draw from. This is the one change everything else depends on. |
| No source for animations | A library of about 18 technique animations, picked by the step's technique | Nobody can hand-animate each recipe. With a library, a recipe a user types in gets animated for free. |
| One timer per step, step by step | Timers detach from steps and run in a dock | Real cooking overlaps: the rice simmers while you chop. |
| "Event-based" tracking, but the schema stores a mutable `isCompleted` checkbox | A real append-only event log; stats are computed from it | Makes the claim true, gives resume-after-reload, and yields real timing data. |
| XP, levels, Beginner → Advanced badges | A technique map: what you've actually practiced, counted from cooked steps | XP is an invented number that rewards clicking through. Technique counts are true and come free from structured steps. |
| Recipe builder form is the core feature | Paste a recipe (text or URL) and get an animated draft; the builder is an editor for that draft | Typing a recipe into a form is the highest-friction thing in the app. Import fixes the empty-app problem. |
| Nutrition via Open Food Facts (days 26–27) | Cut | Open Food Facts is a barcode database for packaged products. It handles "2 onions" badly, and nutrition isn't what this app is about. |
| Image upload to S3 in week 2 | Deferred | The animations are the visuals. One optional finished-dish photo can come later. |
| Cron job for streaks | A query | A weekly streak is a `GROUP BY week` over sessions. |
| Deploy on day 28 | Deploy at the end of milestone 1 | Phones in kitchens find problems that laptops don't. |
| DAU and 30-day retention metrics | Dropped | There are no users to measure. |
| Day-by-day calendar | Five milestones, each ending in something you can cook with | The calendar was already stale: several unchecked boxes are done, and one checked area was never committed. |

Kept as is: Next.js, TypeScript, Tailwind, Prisma, Postgres, Zod, weekly streak, cuisine proficiency, favorites, cooking history.

## The core design

### Structured steps

```ts
type Step = {
  text: string;            // "Sweat the onions until soft and translucent"
  technique: Technique;    // 'saute' — picks the animation
  heat?: 'low' | 'medium' | 'high';
  timer?: { seconds: number; mode: 'stay' | 'background' };
  cue?: string;            // "soft, translucent, no browning"
  uses: { ingredientId: string; note?: string }[];
};
```

Each step shows the amounts it uses ("2 tbsp butter", not "the butter"), so nobody scrolls back to the ingredient list with wet hands.

### The stage

Six stations, each a hand-built SVG scene: **board, bowl, pan, pot, oven, rest**. Techniques are variations on a station:

| Station | Techniques |
|---|---|
| Board | chop, mince, slice, season |
| Bowl | whisk, fold, knead, marinate |
| Pan | sauté, sear, fry |
| Pot | boil, simmer, drain |
| Oven | roast, bake, broil |
| Rest | rest, chill, plate |

Three rules for the animations:

1. **They carry information.** The loop shows the motion (what folding looks like). The scene shows the target (onions go from white to gold as the timer runs). Heat is visible on the burner.
2. **Ingredients are tokens that travel.** The garlic you minced on the board in step 2 is the same token that drops into the pan in step 4.
3. **Motion can be turned off.** With `prefers-reduced-motion`, scenes show a still frame of the end state.

Look: flat two-ink illustration (tomato red and ink on cream), like a risograph print. It is distinctive, and it keeps 18 scenes cheap to draw and consistent. The current Inter + Lora pairing stays.

### Timers

- A timer stores the time it ends, not a countdown, so it survives reloads and a sleeping phone.
- `background` timers move to a dock and keep running across steps. `stay` timers hold you on the step.
- Screen Wake Lock keeps the display on while cooking.
- A finished timer plays a sound, vibrates and shows which step it belongs to.

### Built for a kitchen

- Type readable from a metre away. One step per screen.
- Tap anywhere on the right half for next, left half for back. Arrow keys and space on desktop.
- Starts with a mise en place screen: the ingredient tokens line up and you tick them off.
- Ends with a short log: rating, one note, "cook again?". This comes from the existing prototype.

### Sessions as events

One pure reducer, `(state, event) => state`, is the player. The client runs it live. The server stores the events and can replay them.

```
session_started · step_entered · step_completed · timer_started
timer_finished · timer_cancelled · session_paused · session_finished
```

- Events get their id on the client, so resending is safe. They queue locally if the network drops.
- Reloading mid-cook replays the events and puts you back where you were.
- When a session finishes, a summary row is written (duration, techniques practiced, cuisine). The dashboard reads summaries. Events remain the source of truth.
- A session stores a snapshot of the recipe it was cooked from, so editing or deleting a recipe never changes history.

### Skill tracking

All of it is derived from sessions:

- **Technique map**: how many times you've practiced each technique, and which you've never tried.
- **Cuisine proficiency**: sessions per cuisine, weighted by difficulty.
- **Weekly streak**: consecutive weeks with at least one finished session.
- **Pace**: your time per step against the recipe's estimate.
- **Next up**: recipes that use a technique you haven't practiced. This is a query, with no ML.

A session only counts if it took a plausible amount of time, so tapping through a recipe earns nothing.

## Data model changes

Against the current `prisma/schema.prisma`:

| Current | Problem | Change |
|---|---|---|
| `RecipeStep` has `instruction` and `durationMinutes` only | Nothing to animate from | Add `technique` (enum), `heat`, `timerSeconds`, `timerMode`, `cue`; add `StepIngredient` join |
| `@@unique([recipeId, stepNumber])` | Swapping two steps violates the constraint mid-update | Plain indexed `position` |
| `@@unique([recipeId, ingredientId])` | Can't list an ingredient twice ("salt, divided") | Drop it |
| Global `Ingredient` table with unique `name` | "Onion", "onions" and "yellow onion" become three shared rows any user can create | Ingredient lines belong to the recipe: `quantity`, `unit`, `name`. Drop the nutrition columns. |
| `SessionStepProgress` with `isCompleted` | Mutable state, tied to step rows that vanish on edit | Replace with `SessionEvent(id, sessionId, type, stepIndex, at, payload jsonb)` |
| `CookingSession` references the live recipe | Editing a recipe rewrites history | Add `recipeSnapshot jsonb` and summary columns; `recipeId` becomes nullable |
| No `onDelete` rules | Deleting a recipe fails on foreign keys | Cascade to steps, ingredients, favorites; set null on sessions |
| `difficultyLevel String?` | Free text | Enum: `easy`, `medium`, `hard` |
| `updatedAt @default(now())` | Never updates | `@updatedAt` |
| `totalTimeMinutes` stored | Duplicates prep + cook | Derive it |
| `passwordHash` required | Blocks any non-password login | Move credentials to the auth library's tables |
| Column naming is half `@map("snake_case")`, half not | Inconsistent | Map everything to snake_case, including table names |

There is no production data, so this is one fresh migration, not a series of patches.

## Stack

- **Keep**: Next.js 16, React 19, TypeScript, Tailwind 4, shadcn, Prisma 6, Postgres, Zod, Zustand (for the player store).
- **Add**: `motion` for scene animation, Vitest for the reducer, parser and stats, Playwright for one end-to-end cook.
- **Auth**: Better Auth with email and password, in milestone 4. `@auth/core` and `@auth/prisma-adapter` are installed but unused, and the schema has none of the tables the adapter needs; remove them.
- **Hosting**: Vercel and Neon Postgres. A `docker-compose.yml` for local Postgres is the only Docker needed.
- **Dropped**: S3, cron, webhooks, Open Food Facts, ML recommendations.

## Milestones

Each one ends with something you can cook from.

### M0 — Clear the deck

- [x] Commit or park the uncommitted work (see "State of the repo")
- [x] Rewrite the schema as above; one fresh migration
- [x] Fix the seed (see below) and seed three real recipes with structured steps
- [x] Remove unused auth packages; add Vitest

**Done when**: `prisma migrate reset` gives a clean database with three fully structured recipes.

### M1 — The player

No database, no login. One recipe as a typed constant.

- [x] Player reducer and event types, test-first
- [x] Stage with three stations (board, pan, pot) and about six techniques
- [x] Ingredient tokens and the mise en place screen
- [x] Step navigation: tap zones, keyboard, progress rail
- [x] Timer dock, wake lock, sound and vibration
- [x] Finish screen
- [ ] Deploy

**Done when**: you cook a real dinner from it on a phone without touching the laptop.

### M2 — Memory

- [x] Recipes load from Postgres; recipe list and detail pages
- [x] Event ingestion endpoint with idempotent writes and a local queue
- [x] Resume a session after reload
- [x] Session summary on finish; rating and note
- [x] Photo of the dish at the end of every cook (stored in Postgres, owner only)
- [x] Cooking again: earlier cooks and the last note on the recipe page and at mise en place; last time's photo beside today's
- [x] History page
- [x] Guest sessions

**Done when**: closing the tab mid-cook and reopening it puts you back on the same step with timers intact.

### M3 — Getting recipes in

- [x] Parser: pasted text → ingredients (quantity, unit, name) and steps, test-first
- [x] Technique and timer detection from step text ("simmer for 8–10 minutes" → `simmer`, 540 s, background)
- [x] URL import by reading the page's `schema.org/Recipe` data
- [x] Step composer: edit the draft with a live preview of each step's animation
- [x] Remaining stations (bowl, oven, rest) and the rest of the technique library
- [x] Serving scaler

**Done when**: pasting a recipe from any major recipe site gives a playable, animated cook-along in under a minute of fixing up.

### M4 — Accounts and skill

- [x] Sign up, log in, protected routes; guest sessions attach to the new account
- [x] My recipes, favorites, edit, delete
- [x] Technique map, cuisine proficiency, weekly streak, pace
- [x] "Next up" suggestions
- [x] Profile page

**Done when**: after five cooked sessions the dashboard tells you something true that you didn't already know.

### M5 — Ship it

- [x] Landing page that is the player: a recipe starts playing with no sign-up
- [x] Reduced motion, keyboard and screen-reader pass
- [x] Loading, empty and error states
- [x] One Playwright test that cooks a recipe end to end
- [x] README with an architecture diagram and a short demo recording

**Done when**: a stranger with the link is watching a step animate within ten seconds.

### Later

Voice control ("next", "start timer") · cooking two recipes at once on a merged timeline · finished-dish photo · public share links · unit conversion · nutrition, using USDA FoodData Central.

## Status on 2026-11-15

Milestones 0 to 5 are built on `main`. Still open:

- [x] Deploy: Vercel project `cookbook` at https://cookbook-eight-jet.vercel.app, Neon Postgres with the current schema and the 11 public recipes. Deployed with `vercel deploy --prod` from this folder; nothing deploys on push.
- [ ] Try it on a real phone: chime, vibration, wake lock and touch.
- [ ] Wok and steamer scenes. Stir-frying is drawn in the skillet and steaming in a pot.
- [ ] Importer accuracy, second pass. Stirring on the heat is now read as cooking and timers land on the right step, but boil versus simmer, marinating and soaking are still often wrong. `npx tsx scripts/audit-import.ts` measures it.

## State of the repo before this work

Found while reviewing, on 2026-11-14:

- **`src/app/page.tsx` is 1,600 lines of uncommitted work**: a "Recipe Box" prototype with in-memory data, save-by-URL, statuses (want, tried, rotation, not again) and a rated cook log. It is a different product from the base plan and doesn't touch the database. This plan keeps its quick-add and rated cook log and drops the rest. Park it on a `prototype/recipe-box` branch before M0.
- **`prisma/` is untracked.** The schema and the only migration have never been committed, and the last commit is from January.
- **The seed is wired up twice.** `package.json` points at `prisma/seed.ts`, which doesn't exist. `prisma.config.ts` points at `prisma/seed.js`, which does. Keep the config entry and delete the `package.json` one.
- `prisma.config.ts` imports `dotenv`, which is only installed as another package's dependency. Add it explicitly.
- The base plan's unchecked setup boxes (Next.js, Tailwind, shadcn init, ESLint, seed) are done. Prettier is not set up.
- The project has four names: "Rate my Cooking", "CookTrack", "Recipe Box" and `cookbook`. This plan uses **Cookbook**.
