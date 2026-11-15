import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { draftFromJsonLd, extractJsonLdRecipe } from "./jsonld";
import type { RecipeDraft } from "./types";

const USER_AGENT = "Mozilla/5.0 (compatible; recipe-importer)";
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 3;

class ImportError extends Error {}

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
  if (isIP(ip) === 4) return isPrivateV4(ip);
  if (isIP(ip) !== 6) return false;

  const mapped = ip.match(/^(?:0{0,4}:){0,5}:?ffff:(.+)$/);
  if (mapped) {
    const tail = mapped[1];
    if (isIP(tail) === 4) return isPrivateV4(tail);
    const [hi, lo] = tail.split(":").map((h) => parseInt(h, 16));
    if (Number.isFinite(hi) && Number.isFinite(lo)) return isPrivateV4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return (
    /^(?:0{0,4}:){1,7}0{0,4}1?$/.test(ip) ||
    ip === "::" ||
    /^f[cd]/.test(ip) ||
    /^fe[89ab]/.test(ip) ||
    /^ff/.test(ip)
  );
}

async function assertPublic(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const unreachable = new ImportError("That address isn't reachable from here.");
  if (host === "localhost" || host.endsWith(".localhost")) throw unreachable;
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw unreachable;
    return;
  }
  let answers: { address: string }[];
  try {
    answers = await lookup(host, { all: true });
  } catch {
    throw new ImportError("We couldn't find that website.");
  }
  if (!answers.length || answers.some((a) => isPrivateAddress(a.address))) throw unreachable;
}

function parseHttpUrl(raw: string | URL, base?: URL): URL {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new ImportError("That doesn't look like a web address we can open.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ImportError("Only http and https links are supported.");
  }
  return url;
}

async function readCapped(res: Response): Promise<string> {
  const tooLarge = new ImportError("That page is too large to read.");
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw tooLarge;
  if (!res.body) return "";

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw tooLarge;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchHtml(rawUrl: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url = parseHttpUrl(rawUrl);
    for (let hops = 0; ; hops++) {
      await assertPublic(url);
      const res = await fetch(url.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        if (hops >= MAX_REDIRECTS) throw new ImportError("That page redirects too many times.");
        url = parseHttpUrl(location, url);
        continue;
      }
      if (!res.ok) throw new ImportError(`The page responded with an error (${res.status}).`);
      return await readCapped(res);
    }
  } catch (err) {
    if (err instanceof ImportError) throw err;
    if (controller.signal.aborted) throw new ImportError("The page took too long to respond.");
    throw new ImportError("We couldn't reach that page.");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRecipeDraft(url: string): Promise<RecipeDraft> {
  const html = await fetchHtml(url);
  const recipe = extractJsonLdRecipe(html);
  if (!recipe) throw new Error("That page doesn't contain a recipe we can read");
  return draftFromJsonLd(recipe, url);
}
