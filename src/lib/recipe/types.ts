export const STATIONS = ["board", "bowl", "pan", "pot", "oven", "rest"] as const;
export type Station = (typeof STATIONS)[number];

export const TECHNIQUE_STATION = {
  chop: "board",
  mince: "board",
  slice: "board",
  season: "board",
  whisk: "bowl",
  fold: "bowl",
  knead: "bowl",
  marinate: "bowl",
  saute: "pan",
  sear: "pan",
  fry: "pan",
  boil: "pot",
  simmer: "pot",
  drain: "pot",
  roast: "oven",
  bake: "oven",
  broil: "oven",
  rest: "rest",
  chill: "rest",
  plate: "rest",
} as const satisfies Record<string, Station>;

export type Technique = keyof typeof TECHNIQUE_STATION;
export const TECHNIQUES = Object.keys(TECHNIQUE_STATION) as Technique[];

export type Heat = "low" | "medium" | "high";
export type Difficulty = "easy" | "medium" | "hard";

export type TokenShape =
  | "round"
  | "bulb"
  | "leaf"
  | "long"
  | "strand"
  | "cube"
  | "liquid"
  | "grain"
  | "wedge";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  note?: string;
  token: { shape: TokenShape; color: string };
}

export interface StepTimer {
  seconds: number;
  /** stay: wait on this step. background: runs in the dock while you move on. */
  mode: "stay" | "background";
  label: string;
}

export interface StepUse {
  ingredientId: string;
  /** Portion of the ingredient line used here, 0–1. Defaults to 1. */
  portion?: number;
  note?: string;
}

export interface Step {
  text: string;
  technique: Technique;
  heat?: Heat;
  timer?: StepTimer;
  cue?: string;
  uses: StepUse[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  difficulty: Difficulty;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  source?: { name: string; url: string };
  ingredients: Ingredient[];
  steps: Step[];
}

export function stationOf(step: Step): Station {
  return TECHNIQUE_STATION[step.technique];
}
