import { buildDraft, type DraftInput } from "./draft";
import { cleanText, oneLine } from "./clean";
import { parseDuration } from "./timer";
import type { RecipeDraft } from "./types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function typesOf(node: Obj): string[] {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === "string");
}

function findRecipe(node: unknown, depth = 0): Obj | null {
  if (depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findRecipe(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (!isObj(node)) return null;
  if (typesOf(node).includes("Recipe")) return node;
  return findRecipe(node["@graph"], depth + 1) ?? findRecipe(node.mainEntity, depth + 1);
}

const SCRIPT_RE = /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;

export function extractJsonLdRecipe(html: string): unknown | null {
  for (const m of html.matchAll(SCRIPT_RE)) {
    const body = m[1].trim().replace(/^<!--/, "").replace(/-->$/, "").replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, "");
    try {
      const hit = findRecipe(JSON.parse(body));
      if (hit) return hit;
    } catch {
      continue;
    }
  }
  return null;
}

function stepsOf(instructions: unknown): { name?: string; text: string }[] {
  if (typeof instructions === "string") {
    const text = cleanText(instructions);
    return text ? text.split(/\n+/).filter(Boolean).map((line) => ({ text: line.replace(/^\s*(?:step\s*)?\d+[.):]\s*/i, "") })) : [];
  }
  if (Array.isArray(instructions)) return instructions.flatMap(stepsOf);
  if (!isObj(instructions)) return [];
  if (Array.isArray(instructions.itemListElement)) return instructions.itemListElement.flatMap(stepsOf);
  const text = cleanText(instructions.text);
  const name = oneLine(instructions.name);
  if (text) return [{ text, ...(name && { name }) }];
  return name ? [{ text: name }] : [];
}

function firstText(v: unknown): string {
  if (typeof v === "string") return oneLine(v);
  if (Array.isArray(v)) return v.map(firstText).find(Boolean) ?? "";
  if (isObj(v)) return oneLine(v.name);
  return "";
}

function servingsOf(v: unknown): number | undefined {
  const items = Array.isArray(v) ? v : [v];
  for (const item of items) {
    const n = typeof item === "number" ? item : Number(String(item ?? "").match(/\d+(?:\.\d+)?/)?.[0]);
    if (n > 0) return n;
  }
  return undefined;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function draftFromJsonLd(data: unknown, sourceUrl?: string): RecipeDraft {
  const node = findRecipe(data) ?? (isObj(data) ? data : {});
  const warnings: string[] = [];
  if (!findRecipe(data)) warnings.push("The data did not look like a schema.org Recipe.");

  const ingredientSource = node.recipeIngredient ?? node.ingredients;
  const ingredientLines = (Array.isArray(ingredientSource) ? ingredientSource : [ingredientSource])
    .map((l) => oneLine(l))
    .filter(Boolean);

  const url = sourceUrl ?? (typeof node.url === "string" ? node.url : "");
  const name = firstText(node.publisher) || firstText(node.author) || (url && hostOf(url)) || "";
  const input: DraftInput = {
    title: oneLine(node.name),
    description: oneLine(node.description),
    cuisine: firstText(node.recipeCuisine),
    servings: servingsOf(node.recipeYield),
    prepMinutes: parseDuration(node.prepTime),
    cookMinutes: parseDuration(node.cookTime),
    totalMinutes: parseDuration(node.totalTime),
    ...(url && { source: { name: name || url, url } }),
    ingredientLines,
    steps: stepsOf(node.recipeInstructions),
    warnings,
  };
  return buildDraft(input);
}
