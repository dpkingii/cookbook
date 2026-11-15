import { buildDraft } from "./draft";
import { parseIngredientLine } from "./ingredient";
import { isInstruction } from "./steps";
import { durationMinutes } from "./timer";
import type { RecipeDraft } from "./types";

const ING_HEADING = /^(?:#{1,6}\s*)?\**\s*(?:ingredients?|what you(?:'ll| will)? need|you(?:'ll| will) need)\s*:?\s*\**$/i;
const STEP_HEADING = /^(?:#{1,6}\s*)?\**\s*(?:instructions?|directions?|method|steps?|preparation|procedure|how to make(?: it)?)\s*:?\s*\**$/i;
const MARKER = /^\s*(?:[-*•·▪◦–]\s+|\d+[.)]\s+|step\s*\d+\s*[.:)-]?\s*)/i;
const QUANTITY_START = /^(?:\d|[½⅓⅔¼¾⅛⅜⅝⅞]|an? (?:handful|pinch|dash|couple|few|sprig|knob|splash)\b)/i;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

function looksLikeIngredient(line: string): boolean {
  if (/\bto taste$/i.test(line) && wordCount(line) <= 5) return true;
  if (!QUANTITY_START.test(line)) return false;
  const parsed = parseIngredientLine(line);
  if (!parsed.name) return false;
  return parsed.unit !== null || (wordCount(line) <= 6 && !/[.!?]$/.test(line));
}

function looksLikeStep(line: string): boolean {
  return wordCount(line) >= 4 && isInstruction(line);
}

function stripMarker(line: string): string {
  return line.replace(MARKER, "").trim();
}

interface Meta {
  servings?: number;
  prep?: number;
  cook?: number;
  total?: number;
}

function readMeta(line: string, meta: Meta): boolean {
  const servings = line.match(/^(?:serves|servings?|yield|makes)\s*:?\s*(\d+)/i);
  if (servings) {
    meta.servings = Number(servings[1]);
    return true;
  }
  const time = line.match(/^(prep(?:aration)?|cook(?:ing)?|total)\s*time\s*:?\s*(.+)$/i);
  if (!time) return false;
  const minutes = durationMinutes(time[2]);
  if (minutes !== null) {
    const kind = time[1].toLowerCase();
    meta[kind.startsWith("prep") ? "prep" : kind.startsWith("cook") ? "cook" : "total"] = minutes;
  }
  return true;
}

export function draftFromText(text: string): RecipeDraft {
  const lines = String(text ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b-\u200d\ufeff]/g, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());

  const hasHeadings = lines.some((l) => ING_HEADING.test(l) || STEP_HEADING.test(l));
  const meta: Meta = {};
  const head: string[] = [];
  const ingredientLines: string[] = [];
  const stepLines: string[] = [];
  const warnings: string[] = [];

  let mode: "head" | "ing" | "steps" = "head";
  let sub = "";
  let titleTaken = false;

  for (const line of lines) {
    if (!line) continue;
    if (ING_HEADING.test(line)) {
      mode = "ing";
      continue;
    }
    if (STEP_HEADING.test(line)) {
      mode = "steps";
      continue;
    }

    if (mode === "head" && readMeta(line, meta)) continue;

    const bare = stripMarker(line);
    if (!bare) continue;

    if (mode === "head" && hasHeadings) {
      head.push(bare);
      continue;
    }

    if (mode === "head") {
      if (!titleTaken) {
        titleTaken = true;
        const titleLike = !/[.!?]$/.test(bare) && bare.length <= 80 && wordCount(bare) <= 10 && !looksLikeIngredient(bare) && !looksLikeStep(bare);
        if (titleLike) {
          head.push(bare);
          continue;
        }
      }
      if (looksLikeIngredient(bare)) ingredientLines.push(bare);
      else stepLines.push(line);
      continue;
    }

    if (mode === "ing") {
      const heading = bare.match(/^([^:]{1,40}):$/);
      if (heading && !QUANTITY_START.test(bare)) {
        sub = /^for\b/i.test(heading[1]) ? heading[1].toLowerCase() : `for the ${heading[1].toLowerCase()}`;
        continue;
      }
      if (!looksLikeIngredient(bare) && (wordCount(bare) >= 6 || /[.!?]$/.test(bare)) && looksLikeStep(bare)) {
        mode = "steps";
        stepLines.push(line);
        continue;
      }
      ingredientLines.push(sub ? `${bare}, ${sub}` : bare);
      continue;
    }

    if (!/:$/.test(bare)) stepLines.push(line);
  }

  const title = head.length ? head[0] : "";
  if (!title) warnings.push("No title was found, so the recipe is called Untitled recipe.");

  const numbered = stepLines.some((l) => MARKER.test(l));
  const steps: { text: string }[] = [];
  for (const l of stepLines) {
    const body = stripMarker(l);
    if (!body) continue;
    if (numbered && !MARKER.test(l) && steps.length) steps[steps.length - 1].text += ` ${body}`;
    else steps.push({ text: body });
  }

  return buildDraft({
    title,
    description: head.slice(1).join(" "),
    servings: meta.servings,
    prepMinutes: meta.prep,
    cookMinutes: meta.cook,
    totalMinutes: meta.total,
    ingredientLines,
    steps,
    warnings,
  });
}
