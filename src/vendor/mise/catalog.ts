import type { FormName, FormProps } from "./sizes";

/** What an entry fixes about its drawing; the caller still chooses the cut, layout, cooked state and size. */
export type EntryProps<F extends FormName> = Omit<FormProps[F], "cut" | "layout" | "cooked" | "browning" | "size" | "title" | "className">;

export interface CatalogEntry<F extends FormName = FormName> {
  /** Display name. */
  name: string;
  form: F;
  props: EntryProps<F>;
  /** `|`-separated keywords; each may be a regex fragment, and matches with an optional plural `s` or `es`. */
  keywords: string;
}

const e = <F extends FormName>(form: F, name: string, keywords: string, props: EntryProps<F>): CatalogEntry<F> => ({ form, name, keywords, props });

/**
 * Every ingredient mise can draw, by id. Matching is by longest keyword, so a specific name only needs a longer
 * keyword than the general one it shadows: "chili flakes" (a Dust) beats "chili" (a Pepper) without either knowing
 * about the other. Colours come from each form's gallery presets.
 */
export const CATALOG = {
  // Stalk
  scallion: e("stalk", "Scallion", "scallion|green onion|spring onion", { color: "#4f9a3a", base: "#f3f0e2", shape: "scallion" }),
  leek: e("stalk", "Leek", "leek", { color: "#4a7356", base: "#f0eedb", shape: "leek", seed: 2 }),
  celery: e("stalk", "Celery", "celery|celery stalk|celery rib", { color: "#86b04e", base: "#d8e6ab", shape: "celery", seed: 3 }),
  lemongrass: e("stalk", "Lemongrass", "lemongrass|lemon grass", { color: "#a9bd68", base: "#f0e9c2", blush: "#b07a92", shape: "lemongrass", seed: 4 }),

  // Bulb
  shallot: e("bulb", "Shallot", "shallot", { color: "#b8714b", flesh: "#f0d9d3", ring: "#c48f98", shape: "long", seed: 4 }),
  "red-onion": e("bulb", "Red onion", "red onion|purple onion", { color: "#7e2b4c", flesh: "#f4e6ec", ring: "#a3477a", shape: "squat", seed: 2 }),
  "white-onion": e("bulb", "White onion", "white onion", { color: "#efe6d2", flesh: "#f7f4e9", shape: "round", seed: 3 }),
  onion: e("bulb", "Onion", "onion|yellow onion|brown onion", { color: "#c98a3e", flesh: "#f4efdc", shape: "round" }),

  // Clove
  "garlic-head": e("clove", "Head of garlic", "head of garlic|heads of garlic|garlic head|garlic bulb|whole garlic", { part: "head" }),
  garlic: e("clove", "Garlic", "garlic|garlic clove|cloves of garlic|clove of garlic", { part: "clove" }),

  // Knob
  galangal: e("knob", "Galangal", "galangal", { color: "#e8cdb4", flesh: "#f6ecd6", ring: "#b46a5a", tip: "#e5a2a0", shape: "stout", seed: 2 }),
  turmeric: e("knob", "Turmeric root", "turmeric|fresh turmeric|turmeric root", { color: "#b9824f", flesh: "#f08a1c", ring: "#8a5a32", shape: "finger", seed: 3 }),
  ginger: e("knob", "Ginger", "ginger|fresh ginger|ginger root", { color: "#c9a06a", flesh: "#f2dc8c", ring: "#9c7444", tip: "#e8a0a0", shape: "hand", seed: 3 }),

  // Floret
  "purple-cauliflower": e("floret", "Purple cauliflower", "purple cauliflower", { color: "#7a3f7a", shape: "cauliflower", seed: 3 }),
  cauliflower: e("floret", "Cauliflower", "cauliflower", { color: "#f1e8cf", shape: "cauliflower" }),
  broccoli: e("floret", "Broccoli", "broccoli|broccolini|tenderstem|tenderstem broccoli", { color: "#3f7a2e", shape: "broccoli" }),

  // Root
  carrot: e("root", "Carrot", "carrot", { color: "#e8742a", shape: "carrot" }),
  daikon: e("root", "Daikon", "daikon|mooli|white radish", { color: "#f1eee3", shape: "daikon" }),
  "sweet-potato": e("root", "Sweet potato", "sweet potato", { color: "#9a4a3a", flesh: "#f29a4a", shape: "potato", seed: 2 }),
  "red-potato": e("root", "Red potato", "red potato", { color: "#a8423a", flesh: "#f6ecc8", shape: "potato", seed: 3 }),
  potato: e("root", "Potato", "potato", { color: "#b8875a", shape: "potato" }),

  // Round
  "cherry-tomato": e("round", "Cherry tomato", "cherry tomato|grape tomato", { color: "#d8321f", flesh: "#e9573c", shape: "tomato", realSize: 2.5 }),
  tomato: e("round", "Tomato", "tomato", { color: "#d8321f", flesh: "#e9573c", shape: "tomato" }),
  lemon: e("round", "Lemon", "lemon", { color: "#f5d23a", flesh: "#f8e79a", shape: "lemon" }),
  lime: e("round", "Lime", "lime", { color: "#6fa53a", flesh: "#cfe39a", shape: "citrus", seed: 3, realSize: 5.5 }),
  orange: e("round", "Orange", "orange", { color: "#f28a1a", flesh: "#f7a23a", shape: "citrus" }),
  apple: e("round", "Apple", "apple", { color: "#b51f2a", flesh: "#f6ecc8", shape: "apple" }),

  // Curl
  prawn: e("curl", "Prawn", "prawn|king prawn|tiger prawn|jumbo prawn", { shape: "prawn" }),
  "peeled-shrimp": e("curl", "Peeled shrimp", "peeled shrimp|shelled shrimp|peeled prawn|shelled prawn", { peeled: true }),
  shrimp: e("curl", "Shrimp", "shrimp", {}),

  // Pepper: bell peppers and fresh chilies only; ground, flaked and bottled ones are Dust and Pool entries below.
  "green-pepper": e("pepper", "Green bell pepper", "green pepper|green bell pepper|green capsicum", { color: "#3f8a2a", seed: 2 }),
  "yellow-pepper": e("pepper", "Yellow bell pepper", "yellow pepper|yellow bell pepper|yellow capsicum", { color: "#f2c12e", seed: 3 }),
  "orange-pepper": e("pepper", "Orange bell pepper", "orange pepper|orange bell pepper|orange capsicum", { color: "#ee8a1e", seed: 4 }),
  "bell-pepper": e("pepper", "Red bell pepper", "bell pepper|red bell pepper|red pepper|capsicum|red capsicum", { color: "#d42a1e" }),
  "green-chili": e("pepper", "Green chili", "green chil(?:i|li|e)|jalape(?:ñ|n)o|serrano", { color: "#4a8a2a", shape: "chili", seed: 2 }),
  "birds-eye-chili": e("pepper", "Bird's eye chili", "bird'?s eye chil(?:i|li|e)|birdseye chil(?:i|li|e)|thai chil(?:i|li|e)", { color: "#c8241a", shape: "chili", realSize: 5 }),
  chili: e("pepper", "Red chili", "chil(?:i|li|e)|red chil(?:i|li|e)|chil(?:i|li|e) pepper|hot pepper", { color: "#c8241a", shape: "chili" }),

  // Cap: a kind of mushroom needs "<kind> mushroom" too, or plain "mushrooms" outweighs it.
  shiitake: e("cap", "Shiitake", "shiitake|shiitake mushroom|shitake", { color: "#7a4a2a", shape: "shiitake" }),
  "oyster-mushroom": e("cap", "Oyster mushroom", "oyster mushroom|king oyster mushroom", { color: "#bfb4a4", shape: "oyster" }),
  cremini: e("cap", "Cremini", "cremini|crimini|baby bella|chestnut mushroom|cremini mushroom|crimini mushroom|portobello|portobello mushroom", { color: "#9a6a44", seed: 2 }),
  mushroom: e("cap", "Button mushroom", "mushroom|button mushroom|white mushroom", { color: "#efe6d6" }),

  // Strand
  "bean-sprouts": e("strand", "Bean sprouts", "bean sprout|beansprout|mung bean sprout", { shape: "sprout" }),
  "flat-rice-noodles": e("strand", "Flat rice noodles", "flat rice noodle|ho fun|chow fun|hor fun|kway teow|rice stick", { shape: "flat" }),
  "flat-pasta": e("strand", "Fettuccine", "fettuccine|tagliatelle|pappardelle|linguine", { shape: "flat", color: "#e8c77a" }),
  "egg-noodles": e("strand", "Egg noodles", "egg noodle|lo mein|chow mein|ramen|wonton noodle|yee mein", { shape: "egg" }),
  spaghetti: e("strand", "Spaghetti", "spaghetti|spaghettini|bucatini|angel hair|vermicelli|udon|soba|noodle|rice noodle|pasta", {}),

  // Egg: a vessel asks for curds, ribbons or bits by cut.
  egg: e("egg", "Egg", "egg|egg yolk|yolk|egg white", { state: "beaten" }),

  // Leaf
  basil: e("leaf", "Basil", "basil|thai basil|basil leaves|mint|mint leaves", { color: "#3f8a32", shape: "basil" }),
  parsley: e("leaf", "Parsley", "parsley|flat leaf parsley|italian parsley", { color: "#3f7f30", shape: "cilantro", seed: 2 }),
  cilantro: e("leaf", "Cilantro", "cilantro|coriander|coriander leaves|coriander sprig|fresh coriander", { color: "#4f8a3a", shape: "cilantro" }),
  spinach: e("leaf", "Spinach", "spinach|baby spinach", { color: "#2f6a2a", shape: "spinach" }),
  "bok-choy": e("leaf", "Bok choy", "bok choy|pak choi|bok choi|shanghai choy|baby bok choy", { color: "#3d7a33", shape: "bokchoy" }),
  "red-cabbage": e("leaf", "Red cabbage", "red cabbage|purple cabbage", { color: "#6b2d5c", rib: "#ead8e6", heart: "#f6eef3", shape: "cabbage" }),
  cabbage: e("leaf", "Cabbage", "cabbage|napa cabbage|savoy cabbage|green cabbage", { color: "#9cc47a", shape: "cabbage" }),

  // Slab
  "chicken-breast": e("slab", "Chicken breast", "chicken breast", { color: "#f3bba8", outline: "organic", cookedColor: "#efcf9f", seed: 4 }),
  "chicken-thigh": e("slab", "Chicken thigh", "chicken|chicken thigh", { color: "#efa992", outline: "organic", surface: "fatty", fat: "#fbe6c6", cookedColor: "#e6ad6e" }),
  steak: e("slab", "Steak", "steak|beef|flank steak|sirloin|ribeye", { color: "#c8414a", outline: "oval", surface: "marbled", rim: true, fat: "#f8e6dc", cookedColor: "#8c4a36" }),
  pork: e("slab", "Pork", "pork|pork chop|pork loin|pork shoulder", { color: "#efb0a6", outline: "oval", rim: true, fat: "#fbf1e6", cookedColor: "#e4b88c", seed: 3 }),
  salmon: e("slab", "Salmon", "salmon|trout", { color: "#f59a6c", outline: "taper", surface: "flaky", fat: "#fde3d2", cookedColor: "#f4b392" }),
  "white-fish": e("slab", "White fish", "cod|haddock|white fish|halibut", { color: "#f4ede4", outline: "taper", surface: "flaky", fat: "#d9cfc2", seed: 2 }),
  tofu: e("slab", "Tofu", "tofu|bean curd|beancurd", { color: "#f7f1e1", outline: "block", cookedColor: "#e8b770" }),

  // Pool
  "soy-sauce": e("pool", "Soy sauce", "soy sauce|light soy|dark soy|tamari|soy", { color: "#3b1c0c", shape: "thin" }),
  stock: e("pool", "Stock", "[a-z]+ stock|[a-z]+ broth|stock|broth", { color: "#d8a447", beads: "#f2cf6a", shape: "thin", seed: 2 }),
  "red-wine": e("pool", "Red wine", "red wine", { color: "#6e1526", shape: "thin", seed: 3 }),
  "rice-wine": e("pool", "Rice wine", "shaoxing|shaoxing wine|rice wine|cooking wine|mirin|sake|sherry|white wine|wine", { color: "#c9a35a", shape: "thin", seed: 3 }),
  vinegar: e("pool", "Vinegar", "vinegar|rice vinegar", { color: "#ece1b4", shape: "thin", seed: 4 }),
  "sesame-oil": e("pool", "Sesame oil", "sesame oil", { color: "#9a5a1e", shape: "oil", seed: 5 }),
  "chili-oil": e("pool", "Chili oil", "chil(?:i|li) oil|chil(?:i|li) crisp|chil(?:i|li) crisp oil", { color: "#c4401c", flecks: "#6e1206", shape: "oil", seed: 6 }),
  oil: e("pool", "Oil", "oil|olive oil|vegetable oil|neutral oil|peanut oil|canola oil|cooking oil", { color: "#b9a52a", shape: "oil", seed: 5 }),
  honey: e("pool", "Honey", "honey|maple syrup|syrup|golden syrup", { color: "#d8961c", shape: "syrup", seed: 7 }),
  "oyster-sauce": e("pool", "Oyster sauce", "oyster sauce|hoisin|hoisin sauce|black bean sauce|chil(?:i|li) bean sauce|chil(?:i|li) bean paste", { color: "#4a2614", shape: "syrup", seed: 8 }),
  "fish-sauce": e("pool", "Fish sauce", "fish sauce", { color: "#8a4a1c", shape: "thin", seed: 9 }),
  cream: e("pool", "Cream", "cream|heavy cream|double cream|milk|coconut milk|yoghurt|yogurt", { color: "#f5eedc", shape: "creamy", seed: 9 }),
  "tomato-sauce": e("pool", "Tomato sauce", "tomato sauce|tomato paste|passata|marinara", { color: "#b5321d", flecks: "#3d6b2a", shape: "sauce", seed: 10 }),
  "chili-sauce": e("pool", "Chili sauce", "chil(?:i|li) sauce|chil(?:i|li) paste|chil(?:i|li) garlic sauce|sriracha|hot sauce|sambal|gochujang", { color: "#c23b22", shape: "sauce", seed: 11 }),
  "fermented-bean-curd": e("pool", "Fermented bean curd", "fermented bean curd|red fermented bean curd|preserved bean curd|fermented tofu|furu", { color: "#b8402a", shape: "sauce", seed: 15 }),
  juice: e("pool", "Citrus juice", "juice|lemon juice|lime juice|orange juice", { color: "#f2e29a", shape: "thin", seed: 12 }),
  water: e("pool", "Water", "water|ice water|cold water", { color: "#cfe4ec", shape: "thin", seed: 13 }),
  extract: e("pool", "Extract", "extract|vanilla extract|vanilla", { color: "#4a2a14", shape: "thin", seed: 14 }),

  // Dust
  salt: e("dust", "Salt", "salt|sea salt|kosher salt|flaky salt", { color: "#f2f2ef", shape: "crystal" }),
  "brown-sugar": e("dust", "Brown sugar", "brown sugar|palm sugar|muscovado", { color: "#b07a45", shape: "sugar", seed: 3 }),
  sugar: e("dust", "Sugar", "sugar|caster sugar|white sugar|granulated sugar", { color: "#fbf8ef", shape: "sugar", seed: 2 }),
  flour: e("dust", "Flour", "flour|plain flour|all purpose flour|bread flour", { color: "#f3ecdc", shape: "powder", seed: 4 }),
  starch: e("dust", "Cornstarch", "cornstarch|corn starch|cornflour|potato starch|tapioca starch|starch|baking soda|baking powder", { color: "#fbfbf7", shape: "powder", seed: 5 }),
  paprika: e("dust", "Paprika", "paprika|smoked paprika|cayenne|chil(?:i|li) powder", { color: "#b8321a", shape: "powder", seed: 6 }),
  "ground-turmeric": e("dust", "Ground turmeric", "ground turmeric|turmeric powder", { color: "#d99a12", shape: "powder", seed: 7 }),
  spice: e("dust", "Ground spice", "cinnamon|cumin|ground cumin|ground coriander|coriander seed|garam masala|curry powder|five spice|five spice powder|nutmeg|allspice|ground ginger|ginger powder|garlic powder|onion powder", { color: "#8a4a24", shape: "powder", seed: 8 }),
  "chili-flakes": e("dust", "Chili flakes", "chil(?:i|li) flakes|red pepper flakes|crushed red pepper|gochugaru", { color: "#a8240f", speckle: "#e8c46a", shape: "flakes", seed: 9 }),
  "dried-herbs": e("dust", "Dried herbs", "dried oregano|dried thyme|dried basil|dried herbs|italian seasoning|oregano|thyme", { color: "#6f7d3c", shape: "flakes", seed: 10 }),
  "black-pepper": e("dust", "Black pepper", "pepper|black pepper|ground pepper|peppercorn|black peppercorn", { color: "#35302a", speckle: "#8f7d5e", shape: "cracked", seed: 11 }),
  "white-pepper": e("dust", "White pepper", "white pepper|ground white pepper", { color: "#e6dcc3", speckle: "#b9a986", shape: "powder", seed: 12 }),
  "sichuan-pepper": e("dust", "Sichuan pepper", "sichuan pepper|szechuan pepper|sichuan peppercorn|szechuan peppercorn", { color: "#8a3a24", speckle: "#2e1a12", shape: "cracked", seed: 13 }),

  // Grain
  rice: e("grain", "White rice", "rice|white rice|jasmine rice|basmati rice|long grain rice|sushi rice|cooked rice", { color: "#f1ede0", shape: "rice" }),
  "brown-rice": e("grain", "Brown rice", "brown rice", { color: "#c9a46c", shape: "rice", seed: 2 }),
  "green-lentils": e("grain", "Green lentils", "lentil|green lentil|puy lentil", { color: "#7d7a43", accent: "#d9c58a", shape: "lentil", seed: 3 }),
  "brown-lentils": e("grain", "Brown lentils", "brown lentil", { color: "#8a5a34", accent: "#e3c28a", shape: "lentil", seed: 4 }),
  "red-lentils": e("grain", "Red lentils", "red lentil|masoor dal", { color: "#d4683a", accent: "#f0b35a", cookedColor: "#e6a948", shape: "lentil", seed: 5 }),
  "sesame-seeds": e("grain", "Sesame seeds", "sesame|sesame seed|white sesame|toasted sesame seed", { color: "#efe3c4", shape: "seed", seed: 6 }),
  "black-sesame": e("grain", "Black sesame", "black sesame|black sesame seed", { color: "#2e2a27", shape: "seed", seed: 7 }),
  corn: e("grain", "Corn kernels", "corn|corn kernel|sweetcorn|sweet corn", { color: "#f2c230", accent: "#f6e8b4", shape: "kernel", seed: 8 }),
} satisfies Record<string, CatalogEntry>;

export type IngredientId = keyof typeof CATALOG;

/** A regex takes the first alternative that fits, so each entry tries its longest keywords first. */
const ROWS = (Object.entries(CATALOG) as [IngredientId, CatalogEntry][]).map(([id, entry]) => {
  const longestFirst = entry.keywords.split(/\|(?![^(]*\))/).sort((a, b) => b.length - a.length).join("|");
  return { id, re: new RegExp(`(?<![a-z])(?:${longestFirst})(?:e?s)?(?![a-z])`, "gi") };
});

/**
 * The catalog id for an ingredient as a recipe names it ("2 boneless chicken thighs" → "chicken-thigh"), or null when
 * mise has nothing for it. The longest keyword match wins, so "rice noodles" beats "rice"; on a tie the match nearest
 * the end of the name wins, as the head noun usually comes last ("chicken stock" is stock).
 */
export function match(name: string): IngredientId | null {
  const text = name.toLowerCase().replace(/[-_]/g, " ").replace(/[’‘]/g, "'");
  let best: { id: IngredientId; length: number; end: number } | null = null;
  for (const row of ROWS) {
    for (const m of text.matchAll(row.re)) {
      const length = m[0].length;
      const end = m.index + length;
      if (!best || length > best.length || (length === best.length && end > best.end)) best = { id: row.id, length, end };
    }
  }
  return best?.id ?? null;
}
