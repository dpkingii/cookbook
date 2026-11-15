export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  note?: string;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅕": "1/5", "⅖": "2/5",
  "⅗": "3/5", "⅘": "4/5", "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

const UNITS: Record<string, string> = {
  tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  g: "g", gram: "g", grams: "g", gm: "g", gms: "g",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  clove: "clove", cloves: "clove",
  can: "can", cans: "can", tin: "can", tins: "can",
  stalk: "stalk", stalks: "stalk",
  stem: "stem", stems: "stem",
  piece: "piece", pieces: "piece",
  slice: "slice", slices: "slice",
  sprig: "sprig", sprigs: "sprig",
  pinch: "pinch", pinches: "pinch",
  dash: "dash", dashes: "dash",
  handful: "handful", handfuls: "handful",
  bunch: "bunch", bunches: "bunch",
  head: "head", heads: "head",
  package: "package", packages: "package", packet: "packet", packets: "packet",
  stick: "stick", sticks: "stick",
  fillet: "fillet", fillets: "fillet",
  cube: "cube", cubes: "cube",
  drop: "drop", drops: "drop",
  jar: "jar", jars: "jar",
  bottle: "bottle", bottles: "bottle",
  sheet: "sheet", sheets: "sheet",
  knob: "knob",
};

const NUM = String.raw`\d+(?:\.\d+)?(?:\s+\d+/\d+)?|\d+/\d+`;
const RANGE_SEP = String.raw`\s*(?:[-–—]|\bto\b)\s*`;
const QUANTITY = new RegExp(`^(${NUM})(?:${RANGE_SEP}(${NUM}))?(?![\\d/])`);

function toNumber(s: string): number {
  return s
    .trim()
    .split(/\s+/)
    .reduce((sum, part) => {
      const frac = part.match(/^(\d+)\/(\d+)$/);
      return sum + (frac ? Number(frac[1]) / Number(frac[2]) : Number(part));
    }, 0);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function normalise(line: string): string {
  let s = line.replace(/[®™©\u200b-\u200d\ufeff]/g, "").replace(/ /g, " ");
  s = s.replace(/(\d)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_, d, f) => `${d} ${UNICODE_FRACTIONS[f]}`);
  s = s.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (f) => UNICODE_FRACTIONS[f]);
  s = s.replace(/^([\d.]+(?:\s*[-–—]\s*[\d.]+)?)(?=[a-zA-Z])/, "$1 ");
  return s.replace(/\s+/g, " ").trim();
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const notes: string[] = [];
  let s = normalise(line);

  s = s.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    if (inner.trim()) notes.push(inner.trim());
    return " ";
  });
  s = s.replace(/\s+/g, " ").trim();

  const comma = s.indexOf(",");
  if (comma >= 0) {
    const tail = s.slice(comma + 1).trim();
    if (tail) notes.push(tail);
    s = s.slice(0, comma).trim();
  }

  const suffix = s.match(/\s+(to taste|for (?:the|a|serving|garnish)\b.*|optional)$/i);
  if (suffix) {
    notes.push(suffix[1].trim());
    s = s.slice(0, suffix.index).trim();
  }

  s = s.replace(/^(?:about|approximately|approx\.?|roughly)\s+/i, "");

  let quantity: number | null = null;
  const q = s.match(QUANTITY);
  if (q) {
    const lo = toNumber(q[1]);
    quantity = round(q[2] ? (lo + toNumber(q[2])) / 2 : lo);
    s = s.slice(q[0].length).trim();
  } else {
    const article = s.match(/^(?:an?|one)\s+(?=\S)/i);
    const few = s.match(/^(?:a few|few|some|several)\s+/i);
    if (few) s = s.slice(few[0].length);
    else if (article) {
      const next = s.slice(article[0].length).match(/^([a-zA-Z]+)\.?/);
      if (next && UNITS[next[1].toLowerCase()]) {
        quantity = 1;
        s = s.slice(article[0].length);
      }
    }
  }

  let unit: string | null = null;
  const rice = s.match(/^rice cups?\b\.?\s*/i);
  if (rice) {
    unit = "rice cup";
    s = s.slice(rice[0].length);
  } else {
    const u = s.match(/^([a-zA-Z]+)\.?(?=\s|$)/);
    if (u && UNITS[u[1].toLowerCase()]) {
      unit = UNITS[u[1].toLowerCase()];
      s = s.slice(u[0].length).trim();
    }
  }

  if (unit || quantity !== null) s = s.replace(/^of\s+/i, "");

  const name = s.replace(/\s+/g, " ").trim();
  return { quantity, unit, name, ...(notes.length && { note: notes.join(", ") }) };
}
