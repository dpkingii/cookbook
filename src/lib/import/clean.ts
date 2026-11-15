const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", deg: "°", frac12: "½", frac14: "¼", frac34: "¾", hellip: "…", eacute: "é",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z0-9]+));/gi, (all, dec, hex, name) => {
    if (dec || hex) {
      const code = dec ? Number(dec) : parseInt(hex, 16);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : all;
    }
    return NAMED[name.toLowerCase()] ?? all;
  });
}

/** Strips markup and entities. Block-level tags and <br> become newlines so paragraphs survive. */
export function cleanText(s: unknown): string {
  if (typeof s !== "string") return "";
  return decodeEntities(
    s
      .replace(/<\s*br\s*\/?>|<\/\s*(?:p|div|li|h\d)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function oneLine(s: unknown): string {
  return cleanText(s).replace(/\s+/g, " ");
}
