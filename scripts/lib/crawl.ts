import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const USER_AGENT = "Mozilla/5.0 (compatible; recipe-importer)";
const TIMEOUT_MS = 15_000;
const MIN_GAP_MS = 1_000;
const RETRIES = 2;
const MAX_CONSECUTIVE_FAILURES = 5;

export class StopCrawl extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface Fetched {
  status: number;
  body: string;
}

export class PoliteFetcher {
  private last = 0;
  private failures = 0;
  requests = 0;

  private async attempt(url: string): Promise<Fetched> {
    const wait = this.last + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    this.last = Date.now();
    this.requests += 1;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    return { status: res.status, body: await res.text() };
  }

  /** Resolves with the final response, or throws StopCrawl when the site says stop. */
  async get(url: string): Promise<Fetched> {
    let lastError = "";
    for (let tries = 0; tries <= RETRIES; tries++) {
      if (tries > 0) await sleep(2000 * 2 ** (tries - 1));
      try {
        const res = await this.attempt(url);
        if (res.status === 429 || res.status === 403) throw new StopCrawl(`${url} answered ${res.status}; stopping`);
        if (res.status < 500) {
          this.failures = 0;
          return res;
        }
        lastError = `HTTP ${res.status}`;
      } catch (e) {
        if (e instanceof StopCrawl) throw e;
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    this.failures += 1;
    if (this.failures >= MAX_CONSECUTIVE_FAILURES) {
      throw new StopCrawl(`${MAX_CONSECUTIVE_FAILURES} requests in a row failed (last: ${lastError}); stopping`);
    }
    throw new Error(lastError);
  }
}

export function parseRobots(text: string): RegExp[] {
  const rules: RegExp[] = [];
  let applies = false;
  let sawRule = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === "user-agent") {
      if (sawRule) {
        applies = false;
        sawRule = false;
      }
      if (m[2].trim() === "*") applies = true;
    } else if (key === "disallow") {
      sawRule = true;
      const value = m[2].trim();
      if (applies && value) {
        const source = value.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
        rules.push(new RegExp(`^${source.replace(/\\\$$/, "$")}`));
      }
    } else if (key === "allow") sawRule = true;
  }
  return rules;
}

export function isAllowed(url: string, rules: RegExp[]): boolean {
  const u = new URL(url);
  return !rules.some((r) => r.test(u.pathname + u.search));
}

export function locsOf(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
}

export async function readSitemap(url: string, fetcher: PoliteFetcher, depth = 0): Promise<string[]> {
  const { status, body } = await fetcher.get(url);
  if (status !== 200) throw new Error(`sitemap ${url} answered ${status}`);
  const locs = locsOf(body);
  if (!/<sitemapindex\b/i.test(body) || depth >= 2) return locs;
  const nested: string[][] = [];
  for (const child of locs) nested.push(await readSitemap(child, fetcher, depth + 1));
  return nested.flat();
}

export function cachePath(url: string, root = ".cache/import"): string {
  const u = new URL(url);
  const slug =
    `${u.pathname}${u.search}`
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "index";
  return path.join(root, u.hostname.replace(/^www\./, ""), `${slug}.html`);
}

export async function readCache(url: string): Promise<string | null> {
  try {
    return await readFile(cachePath(url), "utf8");
  } catch {
    return null;
  }
}

export async function writeCache(url: string, html: string): Promise<void> {
  const file = cachePath(url);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}
