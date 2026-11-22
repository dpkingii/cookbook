# Cookbook visual design

> The pastel look described under Tokens replaced the earlier white-and-hairline look on 2026-11-16. Where an older rule below says the interface has no colour, the Tokens section wins.

Agreed on 2026-11-16. This replaces the cream-paper print look.

## Who it is for

A beginner cook who wants to learn new dishes and build confidence. They want cooking to be fun, and they are serious about getting better. The app should feel like a serious tool: calm, exact and trustworthy, with warmth coming from the food and the wording.

## Rules

1. **White, ink and hairlines.** Page background is white. Text is near-black. Sections are separated by 1px lines. No shadows, no grey panels, no gradients.
2. **No rounded rectangles.** Every box, button, input, card and image frame has square corners. Circles are allowed for dots and check marks only.
3. **Two typefaces, one job each.**
   - Serif (`font-serif`, Newsreader 500/600): page titles, recipe names, step text, large numbers.
   - Sans (`font-sans`, Inter): labels, metadata, body copy, buttons, form fields.
4. **Small-caps labels.** Short labels above values use the `label-caps` utility: 11px, 600, uppercase, 0.14em tracking, muted.
5. **Numbers lead.** Session time, streak and totals are set very large in the serif with tabular figures (`figure` in `src/components/ui/styles.ts`).
6. **One accent, once per screen.** Amber (`--accent`) marks the single thing that just changed or matters now: a "+27m" delta, today's box, a first-time technique, the current step's progress segment. Never use it for buttons or decoration.
7. **Buttons are ink.** Primary: black fill, white text. Secondary: 1px outline. One primary action per screen.
8. **Colour lives in the food.** Illustrations are black line on white with ingredient colours as flat fills. The interface around them has no colour.
9. **Few things per screen.** Prefer a hairline list row to a card. Prefer leaving space to filling it.
10. **Plain, encouraging words.** Say what happened and what is next. No exclamation marks, no mascots, no confetti.

## Tokens

One page colour everywhere, with a pastel accent that changes by room. The page that is showing sets `data-tone` and the root picks the accent (`:root:has([data-tone])` in `globals.css`).

| Token | Value | Where |
|---|---|---|
| `--bg` | `#e4f3e8` | Every page: a soft mint |
| `--surface` | `#ffffff` | Sheets: illustrations, cards, fields, navigation, the cooking footer |
| `--room` | one of the pastels below | Sheet and button shadows, the current step in the progress bar |
| `--tomato` | `#f9b8a6` | Home, Cook tab, sign-in, mise en place, the Cook button, the pan. The default accent |
| `--mint` | `#a9ddb9` | Profile, Skills, the cutting board |
| `--sky` | `#aecbf5` | History, the pot, resting and plating |
| `--pink` | `#f5b5cc` | Recipe page, the oven, the finish flow |
| `--lilac` | `#c9bcf2` | My recipes, the editor, the mixing bowl |
| `--ink` | `#111111` | Text, outlines, primary buttons |
| `--mute`, `--rule`, `--wash` | ink at 68%, 18%, 7% | Secondary text, hairlines, hover |
| `--danger` | `#9b1c1c` | Form errors |
| `--saffron` | `#e9a23b` | Fills inside illustrations only |

- The background never changes between pages. Pastels appear only as accents.
- Text is always ink. White text appears only on ink (buttons, tags, the active navigation item).
- `sheet` is a white rectangle with a 2px ink outline and a 5px pastel shadow. `tag` is a small ink label for the one new thing on a screen.
- No rounded rectangles, no gradients, no soft shadows.

## Type scale

| Role | Classes |
|---|---|
| Page title | `font-serif text-3xl font-medium tracking-[-0.02em]` (sm: `text-4xl`) |
| Step text | `font-serif text-3xl font-medium leading-[1.1]` (sm: `text-5xl`) |
| Recipe name in a list | `font-serif text-xl font-medium` |
| Large figure | `figure text-7xl` |
| Value | `font-serif text-2xl font-medium tabular-nums` |
| Body | `text-base` (16px), `text-[var(--mute)]` for secondary |
| Label | `label-caps` |

Cooking mode text must stay readable from a metre away: step text never below `text-3xl`, the doneness cue never below `text-lg`.

## Layout

- Mobile first. Below 1024px the content column is `max-w-xl`, centred, with 20px side padding.
- From 1024px up, pages sit beside the side rail, left-aligned, up to `max-w-6xl`. Long single-column pages (History) pass `reading` to stay at `max-w-3xl`.
- Screens with the main navigation use `AppShell` (`src/components/site/AppShell.tsx`). Cooking screens have no navigation; mise en place and the step screen widen with `wideColumn`, the finish flow stays a narrow column.
- Touch targets are at least 44px high.

## Navigation

On phones, a fixed bottom bar with three buttons (`src/components/site/MainNav.tsx`). From 1024px up the same component is a side rail instead: wordmark, an ink Cook button, Home, Profile, then History, Skills, My recipes and New recipe. Pages spread out beside it: recipe lists in two or three columns, the recipe page and the cooking step with the stage on one side and the text on the other. The three bottom-bar buttons:

| Button | Route | What it is |
|---|---|---|
| Home | `/` | Browse: "Next to learn" suggestion, then all recipes with cuisine and difficulty filters |
| Cook (centre, black block) | `/cook` | Ready to cook: search field, in-progress cooks to resume, recently cooked and favourite recipes |
| Profile | `/profile` | Streak, time this week, dishes cooked, techniques, the week's check boxes, links to history, skills, my recipes and account |

The bar is hidden in cooking mode (`/cook/[id]`), the finish flow, the recipe editor and the log-in and sign-up pages. There is no top navigation bar; a page may show the "Cookbook" wordmark in the serif at top left.

## Cooking mode

- Top: recipe name as a label, then the cook clock, then Pause as a text button. The clock shows time spent so far (pauses don't count) over the recipe's estimate (prep plus cook), with a thin ink bar filling toward it. Running over is not a warning: it stays ink and the bar simply stays full. Progress is a row of thin segments: done in ink, current in accent, rest in rule.
- The illustration sits in a 1px frame.
- Label line: "Step 4 of 10 · Sauté · Medium heat".
- Step text in the serif.
- Ingredients used in this step as a hairline list with amounts.
- "Done when" has its own label and is set larger than body text. It is the line that tells a beginner they are on track.
- Bottom: timer in the serif at left, Back (ghost) and Next (primary) at right.

## Cooking a recipe again

The recipe page's button reads "Cook it again" once the viewer has finished it. Under it, "Your cooks" is a row of tilted polaroids, oldest on the left, each with its date and rating and linking to that cook's history page, followed by the most recent note. Mise en place shows that note above the ingredients, so it is read before cooking starts. A finished cook reopens on its recap for 15 minutes; after that, opening the recipe starts a new cook.

## Finish flow

After the last step. Each screen has one primary button at the bottom, "Next" until the last screen; Back is a ghost button from the second screen on.

0. **Plate up.** "Take a photo of your plate." An empty place setting in a `sheet` until a photo is picked (camera on phones, file picker on laptops), then the photo itself with Retake. "Skip" continues without one. The photo is shrunk to a JPEG of at most 1600px and 700 KB in the browser, uploaded once the session reaches the server, and shown as a tilted polaroid on screen 1 with its save status. It appears on the history page for that cook (add, replace, remove), as a thumbnail in History, and under "Your plates" on Profile. Photos are private to their owner. When an earlier cook of the same recipe has a photo, the screen shows it beside today's: "Last time · date" on the left, "Today" on the right.
0. **How did it go** (optional): rating and one note. "Save" continues; "Skip" also continues.
1. **Session logged.** Label, recipe name, this session's minutes as the large figure. Then rows: Today (total, with "+Nm" in accent, counting up from the old value), This week (same), Session ("2nd today · 5th this week").
2. **Your week.** Weeks of streak as the large figure. Seven square boxes Monday to Sunday: cooked days filled in ink with a white check, today in accent. "Days cooked: 4 of 7". One sentence on what keeps the streak going.
3. **Techniques tonight.** Each technique practised in this session: name, how many times now, a five-segment meter, and a "First time" label in accent when it is new. Then "Techniques: 12 of 20".
The last screen shown has "Done" instead of "Next", and it returns Home. The flow does not suggest another recipe: the cook has just eaten, and Home already has "Next to learn" for whenever they want it. Guests see a sign-up line on screen 1.

A cook that finished too fast to be real (see `plausible` in the player summary) still shows screen 1 with its time, says plainly that it was a walkthrough and is not counted, and skips screens 2 and 3.

## Illustration

- White background, one hairline for the counter edge. No paper grain, no halftone dots, no offset colour plate.
- Vessels, tools and the stove are white with a 2 to 3px black outline. Flames are solid black shapes (accent when heat is high is not allowed; show heat by flame count and size).
- Food keeps the ingredient colours from the recipe data as flat fills with a black outline.
- Motion, zoom and timing are unchanged.
- The step text can name an appliance, and it wins over the technique: "rice cooker" draws a rice cooker and "microwave" a microwave. Food stays in an appliance for rest steps ("leave it covered to steam") until a later step takes it out.
- A cutting step shows the result, not the cutting: each ingredient the step cuts sits across the front of the board as it should look once cut, and the knife lies along the front edge. Food cut in earlier steps waits smaller along the back. Nothing on the board moves, which was a rough, busy animation before (superseded 2026-11-21: the knife used to rock through the food, whole ahead of the blade and in pieces behind it).
- Food mise can draw (onions, shallots, garlic, ginger, scallions and other stalks, carrots, daikon, potatoes, broccoli, cauliflower, herbs, spinach, bok choy, cabbage, tomatoes, citrus, apples, meat, fish, shrimp, eggs, noodles, bean sprouts, bell peppers, chilies, mushrooms and tofu) is drawn by mise; anything mise doesn't know yet is a pile of token pieces shaped by the cut. The cut is read from the sentence naming the ingredient ("into strips, then small dice" ends diced).
- The front row shares one scale, as close as it can get while the biggest pile fits its slot, so sizes stay true to each other: a garlic clove is still readable and scallion rings are bigger than a pinch of minced garlic.
- In the pan, pot, oven, bowl and on the plate, food mise can draw is strewn as mise pieces at true size (8 units a centimetre, so a 28 cm pan holds pieces at their real scale), cut the way its board step said. Heat cooks them (past a quarter of a heated step) and browns them with time; a pot of water or the microwave only softens them. Long pieces such as meat slices lie down along the pan. Only tomatoes cook down into sauce: peas, chickpeas, lemons and broccoli share their round token but stay pieces, and water cooked with the food turns into a clear glaze rather than staying blue. Herbs and spinach added straight to a dish ("torn basil") go in as picked leaves, not whole sprigs. Noodles and pasta heap in the pan and on the plate at true size: a dry bundle until they have cooked (fresh noodles start soft), then a tangle that soaks up the sauce they are tossed in. Strands mise doesn't know stay a plain tangle, drawn lighter and underneath when noodles share the pan. Eggs are drawn by mise too: beaten egg sets into scrambled curds in a pan and into ribbons in a pot of broth (and in the bowl of soup); on its own, as steamed egg, it stays a custard. A garnish showers down as real pieces of it (scallion rings, chopped cilantro, a few torn parsley leaves) and lands on the food, or on top of a noodle nest or a heap of rice. Two variants per ingredient are drawn once and reused, mirrored and turned a little, so the stage stays quick while timers tick.
- The knife's curved edge faces the food and the board; the straight spine is on top.
- Ingredients are drawn as what they become, not as their token shape alone. Eggs share the round token with tomatoes, but heat sets them into yellow curds rather than reducing them to sauce. A grain measured by the cup (rice) is the body of the dish: a heap in the pan that soy turns golden, a moulded dome when the step says to pack or flip it, and a porridge when it was cooked in water or stock.
