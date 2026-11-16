# Cookbook visual design

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

Defined in `src/app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#ffffff` | Page and surfaces |
| `--ink` | `#111111` | Text, primary buttons, filled marks |
| `--mute` | `#6a6a6a` | Labels, metadata |
| `--rule` | `#e2e2e2` | Hairlines, outlines, empty marks |
| `--wash` | `#f6f6f4` | Rare: a field or illustration backdrop that needs separating |
| `--accent` | `#b4530a` | The one thing that changed |
| `--saffron` | `#e9a23b` | Fills inside illustrations only |

The names `--paper`, `--paper-deep`, `--ink-soft`, `--tomato`, `--tomato-deep` and `--gold` are aliases kept during the migration. New code must not use them, and each screen should drop them as it is restyled.

Shared class strings are in `src/components/ui/styles.ts`: `buttonPrimary`, `buttonGhost`, `textLink`, `input`, `display`, `figure`, `listRow`, `surface`.

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

- Mobile first. Content column is `max-w-xl`, centred, with 20px side padding. Wider screens keep the single column; lists may go to `max-w-4xl` with two columns.
- Screens with the bottom bar use `AppShell` (`src/components/site/AppShell.tsx`).
- Touch targets are at least 44px high.

## Navigation

A fixed bottom bar with three buttons (`src/components/site/BottomNav.tsx`):

| Button | Route | What it is |
|---|---|---|
| Home | `/` | Browse: "Next to learn" suggestion, then all recipes with cuisine and difficulty filters |
| Cook (centre, black block) | `/cook` | Ready to cook: search field, in-progress cooks to resume, recently cooked and favourite recipes |
| Profile | `/profile` | Streak, time this week, dishes cooked, techniques, the week's check boxes, links to history, skills, my recipes and account |

The bar is hidden in cooking mode (`/cook/[id]`), the finish flow, the recipe editor and the log-in and sign-up pages. There is no top navigation bar; a page may show the "Cookbook" wordmark in the serif at top left.

## Cooking mode

- Top: recipe name as a label, Pause as a text button. Progress is a row of thin segments: done in ink, current in accent, rest in rule.
- The illustration sits in a 1px frame.
- Label line: "Step 4 of 10 · Sauté · Medium heat".
- Step text in the serif.
- Ingredients used in this step as a hairline list with amounts.
- "Done when" has its own label and is set larger than body text. It is the line that tells a beginner they are on track.
- Bottom: timer in the serif at left, Back (ghost) and Next (primary) at right.

## Finish flow

After the last step. Each screen has one primary button at the bottom; Back is a ghost button from the second screen on.

0. **How did it go** (optional): rating and one note. "Save" continues; "Skip" also continues.
1. **Session logged.** Label, recipe name, this session's minutes as the large figure. Then rows: Today (total, with "+Nm" in accent, counting up from the old value), This week (same), Session ("2nd today · 5th this week").
2. **Your week.** Weeks of streak as the large figure. Seven square boxes Monday to Sunday: cooked days filled in ink with a white check, today in accent. "Days cooked: 4 of 7". One sentence on what keeps the streak going.
3. **Techniques tonight.** Each technique practised in this session: name, how many times now, a five-segment meter, and a "First time" label in accent when it is new. Then "Techniques: 12 of 20".
4. **Next.** One recipe that teaches a technique not yet practised, with "Teaches sear". Primary button opens that recipe; a text link returns Home.

A cook that finished too fast to be real (see `plausible` in the player summary) still shows screen 1 with its time, says plainly that it was a walkthrough and is not counted, and skips screens 2 and 3.

## Illustration

- White background, one hairline for the counter edge. No paper grain, no halftone dots, no offset colour plate.
- Vessels, tools and the stove are white with a 2 to 3px black outline. Flames are solid black shapes (accent when heat is high is not allowed; show heat by flame count and size).
- Food keeps the ingredient colours from the recipe data as flat fills with a black outline.
- Motion, zoom and timing are unchanged.
