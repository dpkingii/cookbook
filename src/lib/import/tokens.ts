import type { TokenShape } from "@/lib/recipe/types";

type Token = { shape: TokenShape; color: string };

const WHITE = "#f4f0e6";
const SOY = "#3b2418";
const GREEN = "#4f8a3a";

// The longest keyword match wins (so "rice noodles" beats "rice"); on a tie the match nearest the end of the name wins, as it is usually the head noun.
const TABLE: [shape: TokenShape, color: string, keywords: string][] = [
  ["liquid", SOY, "soy sauce|dark soy|light soy|tamari|hoisin|black bean sauce|worcestershire|teriyaki"],
  ["liquid", "#4a2f1d", "oyster sauce|fish sauce|xo sauce"],
  ["liquid", "#c23b22", "tomato paste|tomato sauce|passata|ketchup|sriracha|hot sauce|chili sauce|chilli sauce|sambal|chili oil|chilli oil|gochujang|marinara|salsa"],
  ["liquid", "#e3c56a", "[a-z]+ broth|[a-z]+ stock|broth|stock"],
  ["liquid", "#f1ead6", "coconut milk|coconut cream|milk|cream|buttermilk|yogurt|yoghurt|half and half|half-and-half"],
  ["liquid", "#b9822f", "sesame oil"],
  ["liquid", "#d9b93f", "olive oil|peanut oil|corn oil|canola oil|vegetable oil|cooking oil|sunflower oil|rapeseed oil|coconut oil|avocado oil|oil|ghee|shortening|lard|dripping"],
  ["liquid", "#c9a35a", "wine|sherry|mirin|sake|baijiu|brandy|whiskey|vodka|rum|beer"],
  ["liquid", "#d8c9a0", "vinegar"],
  ["liquid", "#e0a93b", "honey|maple syrup|syrup|molasses|agave|golden syrup"],
  ["liquid", "#e8d36a", "lemon juice|lime juice|juice"],
  ["liquid", "#a9cfe0", "water|ice|club soda|sparkling water"],
  ["liquid", "#6b3a1e", "coffee|espresso|tea"],
  ["liquid", "#c9a35a", "mustard|mayonnaise|mayo|dressing|sauce|marinade|slurry|paste|tahini|miso|vanilla extract|extract"],

  ["grain", WHITE, "garlic powder|onion powder|ginger powder|garlic salt|onion salt|celery salt|sea salt|kosher salt|salt"],
  ["grain", "#e6dcc3", "white pepper"],
  ["grain", "#2b2622", "black pepper|peppercorn|ground pepper"],
  ["grain", "#c0392b", "paprika|cayenne|chili powder|chilli powder|chili flakes|chilli flakes|red pepper flakes|crushed red pepper|gochugaru"],
  ["grain", "#8a5a33", "five spice|five-spice|cinnamon|cumin|coriander seed|turmeric|curry powder|garam masala|nutmeg|clove powder|allspice|star anise|cardamom|spice|seasoning|cloves ground|szechuan pepper|sichuan pepper"],
  ["grain", "#e3c56a", "bouillon|msg|chicken powder|mushroom powder|dashi|yeast"],
  ["grain", "#a8672f", "brown sugar|palm sugar|muscovado|rock sugar"],
  ["grain", WHITE, "baking soda|baking powder|cornstarch|corn starch|potato starch|tapioca|starch|powdered sugar|icing sugar|confectioners|sugar|flour|panko|breadcrumb|bread crumb|cocoa|cornmeal|semolina|gelatin"],
  ["grain", "#eadfc4", "jasmine rice|basmati rice|sushi rice|brown rice|glutinous rice|sticky rice|rice|quinoa|couscous|oats|oat|barley|millet|bulgur|lentil|sesame seed|sesame|chia|flax|seeds|rice cup"],
  ["grain", "#e8c34a", "corn kernel|sweetcorn|corn"],
  ["grain", "#b8864e", "peanut|almond|cashew|walnut|pecan|pistachio|hazelnut|nuts|pine nut"],

  ["strand", "#f3ead6", "rice noodle|egg noodle|noodle|spaghetti|linguine|fettuccine|tagliatelle|vermicelli|ramen|udon|soba|pasta|macaroni|penne|fusilli|rigatoni|lo mein|chow mein|angel hair|bucatini|orzo|glass noodle|cellophane"],
  ["strand", "#efe6c8", "bean sprout|sprouts|enoki|rice stick|bean thread"],

  ["leaf", GREEN, "basil|cilantro|coriander|parsley|mint|thyme|rosemary|oregano|sage|dill|chive|tarragon|bay leaf|curry leaf|herb|spinach|kale|lettuce|arugula|rocket|bok choy|pak choi|choy sum|gai lan|napa|cabbage|chard|watercress|collard|romaine|greens|basil leaves|lemongrass|kaffir"],

  ["wedge", "#d9b36a", "ginger|galangal"],
  ["wedge", "#f3e7c3", "garlic"],
  ["wedge", "#e8d36a", "lemon|lime|orange|grapefruit|yuzu|tangerine|mandarin"],
  ["wedge", "#f0a07a", "shrimp|prawn|crab|lobster|crawfish|crayfish"],
  ["wedge", "#e3b04b", "pineapple|mango|melon|watermelon|papaya"],

  ["bulb", "#e8c98a", "yellow onion|white onion|red onion|onion|shallot|pearl onion"],
  ["bulb", "#5a8f3d", "broccoli|broccolini|cauliflower|romanesco"],
  ["bulb", "#cfd8a8", "fennel|kohlrabi|turnip|radish|daikon|beet|beetroot"],

  ["long", "#5d9440", "scallion|green onion|spring onion|leek|asparagus|green bean|snake bean|long bean|celery|chive stem|garlic chive|chinese chive"],
  ["long", "#e8832a", "carrot|sweet potato|yam|parsnip"],
  ["long", "#6a9a45", "cucumber|zucchini|courgette|okra|eggplant|aubergine"],
  ["long", "#c23b22", "chili|chilli|chile|jalapeno|jalapeño|serrano|thai pepper|red pepper|green pepper"],
  ["long", "#f0d96a", "banana|plantain|lotus root|bamboo shoot"],

  ["cube", "#f3ead6", "tofu|bean curd|tempeh|paneer"],
  ["cube", "#f2d27a", "cheddar|mozzarella|parmesan|parmigiano|feta|gouda|gruyere|brie|ricotta|mascarpone|halloumi|cheese|cream cheese|butter|margarine"],
  ["cube", "#d9c3a0", "bread|toast|bun|bagel|tortilla|cracker|crouton|pita|naan|baguette|brioche"],
  ["cube", "#f0a58c", "salmon|tuna|cod|halibut|tilapia|trout|snapper|sea bass|bass|fish|fillet|mackerel|sardine|anchovy|squid|scallop|clam|mussel|oyster"],
  ["cube", "#9c3b34", "beef|steak|brisket|short rib|ribeye|sirloin|flank|chuck|veal|lamb|mutton|venison|ground beef"],
  ["cube", "#c4675a", "pork|bacon|ham|sausage|chorizo|pancetta|prosciutto|spam|char siu|ribs|belly|salami"],
  ["cube", "#edc9a8", "chicken|turkey|duck|goose|poultry|meat|thigh|breast|drumstick|wing|mince|liver"],

  ["round", "#d63a2b", "tomato"],
  ["round", "#f2e3b8", "egg|yolk|egg white"],
  ["round", "#c9a56a", "potato|taro|cassava"],
  ["round", "#9a7b5a", "mushroom|shiitake|portobello|cremini|champignon|oyster mushroom|truffle"],
  ["round", "#3f9a5a", "pea|snow pea|edamame|zucchini flower"],
  ["round", "#8b4a2b", "bean|chickpea|garbanzo|black bean|kidney bean|pinto"],
  ["round", "#d84a3a", "bell pepper|capsicum|pepper|apple|cherry|strawberry|raspberry|cranberry|pomegranate"],
  ["round", "#6a3f8f", "grape|blueberry|plum|olive|fig|prune|raisin|date"],
  ["round", "#e8832a", "peach|apricot|pumpkin|squash|persimmon"],
  ["round", "#6a9a45", "avocado|pear|kiwi|brussels sprout"],
  ["round", "#f4f0e6", "dumpling|wonton|bao|meatball|gnocchi"],
];

const ROWS = TABLE.map(([shape, color, keywords]) => ({
  token: { shape, color } satisfies Token,
  re: new RegExp(`(?<![a-z])(?:${keywords})(?:e?s)?(?![a-z])`, "gi"),
}));

const FALLBACK: Token = { shape: "round", color: "#c9bfae" };

export function guessToken(name: string): Token {
  const text = name.toLowerCase().replace(/[-_]/g, " ");
  let best: { token: Token; length: number; end: number } | null = null;
  for (const row of ROWS) {
    for (const m of text.matchAll(row.re)) {
      const length = m[0].length;
      const end = m.index + length;
      if (!best || length > best.length || (length === best.length && end > best.end)) {
        best = { token: row.token, length, end };
      }
    }
  }
  return { ...(best?.token ?? FALLBACK) };
}
