import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { draftFromJsonLd, extractJsonLdRecipe } from "../../src/lib/import";
import type { RecipeDraft } from "../../src/lib/import/types";

export interface CorpusRecipe {
  slug: string;
  draft: RecipeDraft;
}

export async function loadCorpus(host: string, only = ""): Promise<CorpusRecipe[]> {
  const dir = path.join(".cache/import", host);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html") && f.includes(only)).sort();
  const out: CorpusRecipe[] = [];
  for (const f of files) {
    const data = extractJsonLdRecipe(await readFile(path.join(dir, f), "utf8"));
    if (data) out.push({ slug: f.replace(/\.html$/, ""), draft: draftFromJsonLd(data, `https://${host}/${f}`) });
  }
  return out;
}
