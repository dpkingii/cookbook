export const MAX_CHARS = 160;

const ABBREVIATIONS = new Set(["oz", "lb", "lbs", "tsp", "tbsp", "min", "mins", "approx", "approximately", "e.g", "i.e", "vs", "etc", "no", "pkg", "sec", "hr", "hrs"]);

export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+(?=\s+(?:["“'(]?[A-Z0-9(]))/g;
  for (const m of text.matchAll(re)) {
    const end = m.index + m[0].length;
    const before = text.slice(start, m.index).match(/([A-Za-z.]+)$/)?.[1]?.toLowerCase();
    const next = text.slice(end).trimStart()[0];
    if (m[0] === "." && before && ABBREVIATIONS.has(before) && /[a-z0-9]/.test(next)) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

export const CUE_RE = /\buntil\s+([^,.;!]+)/i;
const CUE_TAIL = /\s+(?:and|then)\s+(?:then\s+)?(?:set|serve|let|remove|transfer|cover|add|turn|flip|stir|mix|continue|bring|reduce|enjoy|plate|use|pour|take|keep)\b.*$|\s+(?:before|so that)\b.*$/i;

export function detectCue(text: string): string | undefined {
  const m = CUE_RE.exec(text);
  if (!m) return undefined;
  let cue = m[1].replace(/\s*\([^)]*\)/g, "").replace(CUE_TAIL, "").trim();
  if (cue.length > 60) cue = cue.slice(0, cue.lastIndexOf(" ", 60)).trim();
  if (!cue) return undefined;
  return cue[0].toUpperCase() + cue.slice(1);
}

const VERBS = new Set(
  `add adjust allow bake baste beat blanch blend boil break bring broil brown brush carve check chill chop coat combine continue cook cool cover crack cream crumble crush cut deglaze dice dip discard divide drain dress drizzle drop dry dust enjoy fill finish flake flip fluff fold fry garnish get give grate grease grill halve heat hold increase juice keep knead ladle layer leave let lift lower make marinate mash measure melt microwave mince mix mound open pack pan-fry pat peel pierce pinch place plate poach pop pound pour preheat prepare press prick pry pull push put quarter raise reduce refrigerate reheat remove repeat reserve rest return rinse roast roll rotate rub saute scatter scoop score scrape sear season serve set shake shape shred sift simmer skim slice slide smash soak spoon spread sprinkle squeeze stack start steam steep stew stir stir-fry strain stuff create begin grab gather assemble wrap pleat swirl switch take taste tear thaw thin tie tilt toast top toss transfer trim turn twist uncover unwrap use wait warm wash whisk wipe wrap zest scoot massage dissolve soften submerge arrange lay line whip dab separate loosen poke crisp rehydrate flatten`.split(/\s+/),
);

const ADVERB = /^(?:\w+ly|just|also|always|never|well|then|now|next|first|finally|lastly|meanwhile|afterwards?|anyway|so|and|please|slowly|quickly)$/;
export const LEAD_CLAUSE = /^(?:now that|once|after|when|whenever|as|while|if|before|since|using|with|to|for|in|on|over|at|into|by|from|until|meanwhile)\b[^,]*,\s*/i;
const SUBJECT = /^(?:(?:we|you)(?:'ll| will| can| should| need to| want to| may)?|let's|let us|it'?s time to)\s+/i;

export function firstWord(sentence: string): string {
  let s = sentence.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  for (let i = 0; i < 6; i++) {
    const before = s;
    s = s.replace(LEAD_CLAUSE, "").replace(SUBJECT, "").replace(/^be\s+/i, "").replace(/^\(/, "");
    const w = s.match(/^([a-z][a-z'-]*)\s*/i);
    if (w && ADVERB.test(w[1].toLowerCase()) && s.length > w[0].length) s = s.slice(w[0].length).replace(/^[,\s]+/, "");
    if (s === before) break;
  }
  return (s.match(/^[a-z][a-z'-]*/i)?.[0] ?? "").toLowerCase();
}

export function isInstruction(sentence: string): boolean {
  if (/[?:]$/.test(sentence) || /^\(/.test(sentence)) return false;
  if (/^keep in mind\b/i.test(sentence)) return false;
  return VERBS.has(firstWord(sentence));
}

export const TIP = /^(?:chef'?s\s+|pro\s+|quick\s+|helpful\s+)?(?:tip|note|hint|variation|reminder|why)\b/i;
export const ASIDE = /^(?:take (?:a|one) (?:moment|second|minute|breath) to|feel free|be (?:careful|gentle|patient|mindful)|don'?t worry|try (?:to|not)|do (?:this|that|it) (?:\w+ )?(?:thoroughly|well|carefully|gently|slowly)|call |watch (?:out|your)|look at)\b/i;
export const OPTIONAL = /^(?:if (?:you|your|you're|you've|we|i)\b|(?:you (?:can|may|could) )?also\b|you (?:can|may|could)\b)/i;
export const HEAT_LABEL = /^(?:heat off|(?:high|medium[- ]high|medium[- ]low|medium|low)(?: heat)?)\s*[—–]\s*/i;
const TIME_MARKER = /\s*[—–]\s*~?\d[^.!?]*?(?:seconds?|secs?|minutes?|mins?|hours?)\s*$/i;
const LEAD_WORDS = /^(?:(?:then|next|now|and|first|finally|afterwards?|anyway|lastly)\b,?\s+)+/i;
export const PURPOSE = /,?\s+(?:to (?:ensures?|help|prevent|avoid)|so that|so (?:you|they|it)(?:'re|'ll|'s| can| will| don't| won't| are| is)|in order to|which (?:helps|allows|means|will|makes|ensures)|because)\b/i;

export function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function tidy(sentence: string): string {
  let s = sentence
    .replace(HEAT_LABEL, "")
    .replace(TIME_MARKER, "")
    .replace(/^now that\b[^,]*,\s*/i, "")
    .replace(LEAD_WORDS, "")
    .replace(/^(?:make sure|be sure|remember) to\s+(?!not\b)/i, "")
    .trim();
  const subject = s.match(SUBJECT);
  if (subject && VERBS.has(firstWord(s.slice(subject[0].length)))) s = s.slice(subject[0].length);
  const purpose = s.search(PURPOSE);
  if (purpose > 0 && s.slice(0, purpose).split(/\s+/).length >= 3) s = s.slice(0, purpose);
  s = s.replace(/\s+([,.;!?])/g, "$1").replace(/\s{2,}/g, " ").replace(/[\s,;—–-]+$/, "").trim();
  s = capitalise(s);
  return /[.!?)]$/.test(s) ? s : `${s}.`;
}

export function shorten(text: string): string {
  let s = text;
  const lead = LEAD_CLAUSE.exec(s);
  if (s.length > MAX_CHARS && lead && s.length - lead[0].length >= 40) s = capitalise(s.slice(lead[0].length));
  if (s.length > MAX_CHARS) s = s.replace(/\s*\([^)]*\)/g, "");
  while (s.length > MAX_CHARS) {
    let comma = s.lastIndexOf(",");
    while (comma >= 40 && /\b(?:and|or|but|the|a|an|with|to|of|in|on|then)$/i.test(s.slice(0, comma))) comma = s.lastIndexOf(",", comma - 1);
    if (comma < 40) break;
    s = `${s.slice(0, comma)}.`;
  }
  if (s.length > MAX_CHARS) {
    const cut = s.lastIndexOf(" ", MAX_CHARS - 1);
    s = `${s.slice(0, cut > 40 ? cut : MAX_CHARS - 1).replace(/[\s,;.]+$/, "")}…`;
  }
  return s;
}

export function paragraphsOf(text: string): string[] {
  const all = text
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const isItem = (p: string) => !/[.!?:]$/.test(p) && p.split(/\s+/).length <= 14;
  const out: string[] = [];
  for (let i = 0; i < all.length; i++) {
    if (!/:$/.test(all[i]) || !all[i + 1] || !isItem(all[i + 1])) {
      out.push(all[i]);
      continue;
    }
    const items: string[] = [];
    while (all[i + 1] && isItem(all[i + 1])) items.push(all[++i]);
    const doable = items.filter((x) => VERBS.has(firstWord(x)));
    if (doable.length * 2 >= items.length) out.push(...doable.map((x) => `${x}.`));
    else out.push(`${all[i - items.length].replace(/:$/, "")}: ${items.join(", ")}.`);
  }

  const isHeading = (p: string) => !/[.!?:,]/.test(p) && p.split(/\s+/).length <= 7 && !/\d/.test(p);
  const kept = out.filter((p, i) => !(isHeading(p) && i < out.length - 1));
  return kept.length ? kept : out.slice(-1);
}
