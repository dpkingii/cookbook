import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { bbox } from "../core/geometry";
import { rng, type Pt } from "../core/rough";

/**
 * Spaghetti (and other round pasta): thin round rods, a bundle dry, a glossy tangle cooked. Egg noodles: wavy and
 * golden, a coiled nest dry. Flat: wide ribbons, as rice noodles for chow fun or fettuccine, folding over as they cook.
 * Sprout: a bean sprout, a short crisp white stem with a yellow seed head and a thin root, heaped loosely.
 */
export type StrandShape = "spaghetti" | "egg" | "flat" | "sprout";

export interface StrandProps extends ArtProps {
  color?: string;
  shape?: StrandShape;
  /** Halved and wedges break the strands in half; sliced, rings and strips cut them short; diced and minced into bits. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: soft, glossy and draped in a tangle, paler wheat or translucent rice. */
  cooked?: boolean;
  /** The colour of the cooked noodles, as when they have soaked up soy sauce. */
  cookedColor?: string;
  /** 0 is just boiled, 0.5 stir-fried with a few charred patches, 1 crisp. */
  browning?: number;
  seed?: number;
}

export const COLOR: Record<StrandShape, string> = { spaghetti: "#e8c77a", egg: "#e9b94a", flat: "#efe8d8", sprout: "#f2efdc" };
/** How wide each strand is, in box units at the whole drawing's scale. */
export const WIDTH: Record<StrandShape, number> = { spaghetti: 1.5, egg: 1.3, flat: 4, sprout: 2.4 };

export interface StrandPart {
  /** The strand's centre line. */
  line: Pt[];
  width: number;
  /** A flat ribbon's outline, twisting as it folds; round strands are drawn as strokes along `line`. */
  ribbon?: Pt[];
  /** The bounds as drawn, for framing: the ribbon, or the line itself. */
  outer: Pt[];
  thick: number;
  /** -1 darker to 1 lighter, so strands in a heap read apart. */
  tone: number;
  /** A patch charred in the wok, 0 to 1. */
  char?: number;
  /** A bean sprout's yellow seed head, at the start of its line. */
  head?: Pt;
  /** Its thin root, trailing from the end. */
  root?: Pt[];
}

/** A ribbon round a centre line: as wide as `w` where it lies flat, narrower where it twists edge-on. */
export function ribbon(line: Pt[], w: number, seed: number): Pt[] {
  const rand = rng(seed * 7 + 5);
  const phase = rand() * 6.28;
  const freq = 0.6 + rand() * 0.8;
  const side = (s: number) =>
    line.map(([x, y], i): Pt => {
      const [a, b] = [line[Math.max(0, i - 1)]!, line[Math.min(line.length - 1, i + 1)]!];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ww = (w / 2) * (0.45 + 0.55 * Math.abs(Math.cos((i / line.length) * Math.PI * freq * 2 + phase)));
      return [x - ((b[1] - a[1]) / L) * ww * s, y + ((b[0] - a[0]) / L) * ww * s];
    });
  return [...side(1), ...side(-1).reverse()];
}

export function part(shape: StrandShape, line: Pt[], w: number, seed: number, tone: number, char = 0): StrandPart {
  if (shape === "flat") {
    const r = ribbon(line, w, seed);
    return { line, width: w, ribbon: r, outer: r, thick: 0.4, tone, char };
  }
  return { line, width: w, outer: line, thick: 0.4, tone, char };
}

/** A straight dry rod from (x, y) at `angle`. */
export function rod(x: number, y: number, len: number, angle: number): Pt[] {
  return Array.from({ length: 4 }, (_, i): Pt => [x + Math.cos(angle) * len * (i / 3), y + Math.sin(angle) * len * (i / 3)]);
}

/** A wavy line, as a dry egg noodle is crimped. */
export function wave(x: number, y: number, len: number, angle: number, amp: number, freq: number, phase: number): Pt[] {
  const n = Math.max(6, Math.round(len / 2));
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const t = i / n;
    const off = Math.sin(t * Math.PI * 2 * freq + phase) * amp;
    return [x + Math.cos(angle) * len * t - Math.sin(angle) * off, y + Math.sin(angle) * len * t + Math.cos(angle) * off];
  });
}

/** A cooked strand lying loosely: a wandering curve that turns back toward the middle when it reaches the heap's edge. */
export function drape(rand: () => number, cx: number, cy: number, rx: number, ry: number, len: number, wavy: boolean, twist = 1): Pt[] {
  let [x, y] = [cx + (rand() - 0.5) * rx * 1.4, cy + (rand() - 0.5) * ry * 1.4];
  let heading = rand() * Math.PI * 2;
  let turn = (rand() - 0.5) * 0.3;
  const step = 2.2;
  const pts: Pt[] = [[x, y]];
  const n = Math.round(len / step);
  for (let i = 0; i < n; i++) {
    turn += (rand() - 0.5) * 0.12 * twist;
    turn = Math.max(-0.22 * twist, Math.min(0.22 * twist, turn));
    heading += turn;
    const [dx, dy] = [(x - cx) / rx, (y - cy) / ry];
    if (dx * dx + dy * dy > 0.8) {
      const toward = Math.atan2(cy - y, cx - x);
      const diff = Math.atan2(Math.sin(toward - heading), Math.cos(toward - heading));
      heading += diff * 0.35;
    }
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step * 0.75;
    pts.push([x, y]);
  }
  if (!wavy) return pts;
  return pts.map(([px, py], i): Pt => [px + Math.sin(i * 1.4) * 0.6, py + Math.cos(i * 1.4) * 0.6]);
}

/** One bean sprout centred on (x, y): a gently curved stem, its seed head at one end and a thin root at the other. */
export function sprout(rand: () => number, x: number, y: number, len: number, cooked: boolean, seed: number): StrandPart {
  const angle = rand() * Math.PI * 2;
  const bend = (rand() - 0.5) * (cooked ? 2 : 0.9);
  const n = 8;
  const line = Array.from({ length: n + 1 }, (_, i): Pt => {
    const t = i / n;
    const a = angle + bend * t;
    return [x + Math.cos(a) * len * (t - 0.5), y + Math.sin(a) * len * (t - 0.5) * 0.8];
  });
  const end = line[n]!;
  const prev = line[n - 1]!;
  const [dx, dy] = [end[0] - prev[0], end[1] - prev[1]];
  const root: Pt[] = [end, [end[0] + dx * 1.2 + dy * 0.4, end[1] + dy * 1.2 - dx * 0.4], [end[0] + dx * 2.2 + dy * 0.2, end[1] + dy * 2.2 - dx * 0.2]];
  const p = part("sprout", line, WIDTH.sprout * (0.85 + rand() * 0.3), seed, (rand() - 0.5) * 0.6);
  return { ...p, head: line[0], root, outer: [...line, ...root] };
}

/** The whole amount, fitted to the box: a dry bundle or nest, or a cooked tangle. */
export function strandGeometry(shape: StrandShape, seed: number, cooked: boolean): StrandPart[] {
  const rand = rng(seed * 43 + 7);
  const w = WIDTH[shape];
  const parts: StrandPart[] = [];
  if (shape === "sprout") {
    /** A loose heap of sprouts, each a short curved stem; cooked, they go limp and curl more. */
    const n = 34;
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt((i + 0.5) / n);
      const a = i * 2.39996;
      parts.push(sprout(rand, 50 + Math.cos(a) * r * 30, 52 + Math.sin(a) * r * 18, 20 + rand() * 6, cooked, seed * 100 + i));
    }
    return fitStrands(parts);
  }
  if (cooked) {
    const n = shape === "flat" ? 9 : 30;
    for (let i = 0; i < n; i++) {
      /** Flat rice noodles are short, wide and fold over loosely; round ones are long and tangle. */
      const len = (shape === "flat" ? 46 : 80) * (0.7 + rand() * 0.5);
      /** Later strands sit on top of the heap, so they gather toward its middle. */
      const lift = i / n;
      parts.push(part(shape, drape(rand, 50, 52 - lift * 6, 38 - lift * 14, 24 - lift * 9, len, shape === "egg", shape === "flat" ? 0.4 : 1), w * (shape === "flat" ? 1.9 : 1) * (0.9 + rand() * 0.2), seed * 100 + i, (rand() - 0.5) * 0.8 + lift * 0.3));
    }
    return fitStrands(parts);
  }
  if (shape === "egg") {
    /** A dry nest: crimped noodles coiled round and round. */
    for (let i = 0; i < 26; i++) {
      const r = 10 + rand() * 30;
      const a0 = rand() * 6.28;
      const span = 2 + rand() * 2.5;
      const pts = Array.from({ length: 40 }, (_, j): Pt => {
        const a = a0 + (j / 39) * span;
        const rr = r + Math.sin(j * 1.1 + i) * 0.9;
        return [50 + Math.cos(a) * rr, 52 + Math.sin(a) * rr * 0.78];
      });
      parts.push(part(shape, pts, w, seed * 100 + i, (rand() - 0.5) * 0.8));
    }
    return fitStrands(parts);
  }
  /** A dry bundle: straight and nearly parallel, fanning a little at the ends, lying on a slant. */
  const n = shape === "flat" ? 12 : 17;
  const angle = -0.32;
  for (let i = 0; i < n; i++) {
    const across = (i / (n - 1) - 0.5) * (shape === "flat" ? 22 : 16);
    const fan = (rand() - 0.5) * 0.05;
    const len = 86 + (rand() - 0.5) * 3;
    const [x, y] = [50 - Math.cos(angle) * len * 0.5 - Math.sin(angle) * across, 50 - Math.sin(angle) * len * 0.5 + Math.cos(angle) * across];
    parts.push(part(shape, rod(x, y, len, angle + fan), w, seed * 100 + i, (rand() - 0.5) * 0.8));
  }
  return fitStrands(parts);
}

/** Scales a set of strands to fill the box, widths and all. */
export function fitStrands(parts: StrandPart[], room: Pt = [86, 78]): StrandPart[] {
  const b = bbox(parts.flatMap((p) => p.outer));
  const k = Math.min(room[0] / b.w, room[1] / b.h, 1.4);
  const [cx, cy] = [(b.l + b.r) / 2, (b.t + b.b) / 2];
  const go = (pts: Pt[]) => pts.map(([x, y]): Pt => [50 + (x - cx) * k, 50 + (y - cy) * k]);
  return parts.map((p) => ({ ...p, line: go(p.line), ribbon: p.ribbon && go(p.ribbon), outer: go(p.outer), width: p.width * k, head: p.head && go([p.head])[0], root: p.root && go(p.root) }));
}
