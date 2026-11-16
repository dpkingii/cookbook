import type { Technique } from "./types";

export interface TechniqueNote {
  /** How the technique is written in running text and on buttons. */
  name: string;
  /** What you physically do, in one sentence. */
  what: string;
  /** Why a recipe asks for it. */
  why: string;
  /** What it looks, sounds or feels like when it is going right. */
  right: string;
  /** The most common way it goes wrong, and what to do about it. */
  fix: { when: string; then: string };
}

export const TECHNIQUE_NOTES: Record<Technique, TechniqueNote> = {
  chop: {
    name: "Chop",
    what: "Cut food into rough, similar-sized pieces with a rocking knife.",
    why: "Pieces of the same size cook at the same speed, so nothing is raw while the rest burns.",
    right: "The tip of the knife stays on the board and the heel does the work. Your other hand is curled like a claw, knuckles forward.",
    fix: { when: "The pieces are all different sizes", then: "slow down and cut the biggest ones again. Even beats fast." },
  },
  mince: {
    name: "Mince",
    what: "Chop something as finely as you can, almost to a paste.",
    why: "Tiny pieces melt into the dish and give flavour everywhere instead of in bites.",
    right: "Rock the knife back and forth over the pile, gather it up with the blade, and go again.",
    fix: { when: "It sticks to the knife", then: "wipe the blade with a finger from the blunt side and keep going. That is normal." },
  },
  slice: {
    name: "Slice",
    what: "Cut food into flat, even pieces with one smooth stroke each.",
    why: "Even slices cook evenly and look deliberate on the plate.",
    right: "Let the knife glide forward and down. You are drawing the blade through, not pressing straight down.",
    fix: { when: "Meat squashes or tears", then: "chill it for 20 minutes first, and cut across the lines you can see in it." },
  },
  season: {
    name: "Season",
    what: "Add salt, pepper or spices and spread them evenly.",
    why: "Salt added early has time to get inside the food. Salt added only at the end sits on the surface.",
    right: "Sprinkle from a hand's height above the food so it falls like snow and lands evenly.",
    fix: { when: "You are not sure it is enough", then: "taste. Add a little, stir, wait a few seconds and taste again." },
  },
  whisk: {
    name: "Whisk",
    what: "Beat ingredients together quickly until they become one smooth mixture.",
    why: "It blends things that would rather stay apart, and breaks up lumps.",
    right: "Fast, small circles from the wrist. The mixture turns one even colour.",
    fix: { when: "There are lumps of starch or flour", then: "press them against the side of the bowl, then whisk again." },
  },
  fold: {
    name: "Fold",
    what: "Combine gently by cutting down through the middle and turning the mixture over itself.",
    why: "Stirring would knock out air or break delicate pieces. Folding keeps them.",
    right: "Slow strokes with a spatula: down the centre, along the bottom, up and over. Turn the bowl as you go.",
    fix: { when: "You still see streaks", then: "a few are fine. Stop as soon as it mostly comes together." },
  },
  knead: {
    name: "Knead",
    what: "Press, stretch and turn dough over and over.",
    why: "It builds the stretchy structure that lets dough hold its shape and rise.",
    right: "Push away with the heel of your hand, fold it back, turn a quarter. The dough goes from shaggy to smooth and springy.",
    fix: { when: "It sticks to everything", then: "dust your hands, not the dough, with a little flour and keep going. It gets less sticky as you knead." },
  },
  marinate: {
    name: "Marinate",
    what: "Coat food in a seasoned liquid and leave it to soak.",
    why: "The flavour moves into the surface, and some marinades make meat more tender.",
    right: "Every piece is coated and there is no dry patch. Then you leave it alone.",
    fix: { when: "You are short on time", then: "even 15 minutes helps. Cut the pieces smaller so more surface touches the marinade." },
  },
  saute: {
    name: "Sauté",
    what: "Cook small pieces in a little fat over medium heat, moving them now and then.",
    why: "It softens food and brings out sweetness without drying it.",
    right: "A steady, gentle sizzle. The pieces soften and turn glossy.",
    fix: { when: "It is browning too fast", then: "lower the heat and add a spoonful of water to cool the pan." },
  },
  sear: {
    name: "Sear",
    what: "Cook the surface of food on very high heat until it browns.",
    why: "Browning creates deep, savoury flavour that gentle cooking never does.",
    right: "A loud sizzle the moment the food touches the pan. Leave it alone and it will release when it is browned.",
    fix: { when: "It sticks when you try to turn it", then: "it is not ready. Wait another 30 seconds and try again." },
  },
  fry: {
    name: "Fry",
    what: "Cook quickly in hot oil, often tossing or stirring the whole time.",
    why: "High heat and constant movement cook food fast, so it stays crisp outside and juicy inside.",
    right: "The pan is hot before anything goes in, the oil shimmers, and the food keeps moving.",
    fix: { when: "The food is steaming instead of sizzling", then: "the pan is too full or not hot enough. Cook in two batches." },
  },
  boil: {
    name: "Boil",
    what: "Cook in water that is bubbling hard.",
    why: "It is the fastest way to cook pasta, noodles and firm vegetables through.",
    right: "Big bubbles break the surface the whole time, and they do not stop when you stir.",
    fix: { when: "It is about to boil over", then: "lift the pot off the heat for a moment and turn the heat down a little." },
  },
  simmer: {
    name: "Simmer",
    what: "Cook in liquid that is barely bubbling.",
    why: "Gentle heat lets flavours come together and sauces thicken without the bottom catching.",
    right: "A few small bubbles rise lazily. It is quiet.",
    fix: { when: "It is bubbling hard", then: "turn the heat down. If the bottom is sticking, stir and add a splash of water." },
  },
  drain: {
    name: "Drain",
    what: "Pour off the water, or rinse something and let the water run away.",
    why: "It stops the cooking and gets rid of water that would thin your sauce.",
    right: "Pour away from yourself so the steam goes the other way. Shake the colander once or twice.",
    fix: { when: "The recipe wants some cooking water kept", then: "scoop out a cup before you pour. It is easy to forget." },
  },
  roast: {
    name: "Roast",
    what: "Cook in a hot oven with dry heat, uncovered.",
    why: "The outside browns and concentrates in flavour while the inside cooks through.",
    right: "Pieces are spread out with space between them. The edges turn golden and smell toasty.",
    fix: { when: "Things are pale and soft", then: "they are too crowded. Spread them over two trays and they will brown." },
  },
  bake: {
    name: "Bake",
    what: "Cook in the oven with steady, even heat until set.",
    why: "Batters and doughs need gentle all-round heat to rise and hold their shape.",
    right: "Risen, golden on top, and a skewer pushed into the middle comes out clean.",
    fix: { when: "The top is browning before the middle is done", then: "lay a sheet of foil loosely over it and keep baking." },
  },
  broil: {
    name: "Broil",
    what: "Cook close under very strong heat from above.",
    why: "It chars and caramelises the surface in minutes.",
    right: "The surface bubbles and darkens at the edges. Stay next to the oven the whole time.",
    fix: { when: "It is going from brown to black", then: "pull it out now. Under this heat, 30 seconds is the difference." },
  },
  rest: {
    name: "Rest",
    what: "Leave the food alone, off the heat, for a few minutes.",
    why: "Juices settle back into meat, and doughs and batters relax. Cutting too early loses them.",
    right: "Nothing. You wait, and it is part of the cooking.",
    fix: { when: "You are tempted to cut in", then: "use the time to wipe down, set the table or warm the plates." },
  },
  chill: {
    name: "Chill",
    what: "Cool the food in the fridge until cold or firm.",
    why: "Cold sets textures, firms things up for cutting and lets flavours settle.",
    right: "Covered, on a flat shelf, with space around it so cold air can reach it.",
    fix: { when: "It needs to cool faster", then: "spread it in a shallow dish. Thin layers chill much faster than deep ones." },
  },
  plate: {
    name: "Plate",
    what: "Move the food to its serving dish and add the finishing touches.",
    why: "Garnishes added at the end stay fresh and bright, and a tidy plate makes the effort show.",
    right: "Food in the middle, a clean rim, and the garnish on last.",
    fix: { when: "The rim is splashed", then: "wipe it with a damp cloth before it goes to the table." },
  },
};
