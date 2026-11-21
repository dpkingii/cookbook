import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, smooth, type Pt } from "../core/rough";

/** Ginger branches like a hand, turmeric grows in slim fingers, galangal is stout and tightly ringed. */
export type KnobShape = "hand" | "finger" | "stout";

export interface KnobProps extends ArtProps {
  /** Colour of the skin. */
  color: string;
  /** Colour of the flesh, seen at broken ends and when peeled. */
  flesh?: string;
  /** Colour of the rings across the skin. */
  ring?: string;
  /** Tint at the tips of fresh branches, as on young ginger. */
  tip?: string;
  shape?: KnobShape;
  peeled?: boolean;
  /** Halved splits a finger lengthwise. Slices are coins, strips are matchsticks, and wedges draw it grated. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked root: softened, shrunk a little and browned as far as `browning` says. A whole root roasts in its skin. */
  cooked?: boolean;
  /** Colour of soft cooked flesh before any browning. */
  cookedColor?: string;
  /** 0 is soft and translucent, 0.5 golden, 1 crisp and deep brown, as fried ginger for a garnish. */
  browning?: number;
  seed?: number;
}

/** One plump, egg-shaped segment of the root. Segments join at ringed, pinched joints. */
export interface Segment {
  center: Pt;
  /** Direction the segment grows in, as a unit vector. */
  dir: Pt;
  length: number;
  width: number;
  /** Outline, drawn as a closed curve. */
  path: string;
  /** Rings across the segment, as open curves. */
  rings: Pt[][];
  /** Short creases in the skin. */
  wrinkles: Pt[][];
  /** Tiny dots on the skin, where roots and buds once were. */
  dots: Pt[];
  /** Grows nothing further: its far end is a fresh tip. */
  tip: boolean;
  start: Pt;
  end: Pt;
}

export interface KnobGeometry {
  segments: Segment[];
  /** The broken end of the first segment, showing flesh. */
  cut: { at: Pt; rx: number; ry: number; deg: number };
  bottom: number;
}

interface Spec {
  length: number;
  width: number;
  /** How many segments the main line grows. */
  chain: number;
  /**
   * Fingers off the body: the main-line segment they grow from, how far along it, their turn in degrees, how
   * many segments, and how long they are against the segment they grow from. Most turn the same way, like a hand.
   */
  branches: { from: number; at: number; deg: number; segments: number; size: number }[];
  /** How much each new segment shrinks. */
  shrink: number;
  /** How much fuller each segment is at its start than at its end. */
  egg: number;
  /** Fine rings within each segment. */
  rings: number;
  /** How far along a segment the next one starts: lower overlaps more and pinches less. */
  step: number;
  /** How wide a side branch starts, compared with the segment it grows from. */
  branchWidth: number;
  /** How much each segment turns from the one before, at most, in degrees. */
  wander: number;
}

const SPECS: Record<KnobShape, Spec> = {
  hand: {
    length: 26,
    width: 22,
    chain: 3,
    branches: [
      { from: 0, at: 0.4, deg: -80, segments: 2, size: 0.8 },
      { from: 1, at: 0.55, deg: -52, segments: 2, size: 0.85 },
      { from: 2, at: 0.45, deg: -30, segments: 1, size: 0.9 },
      { from: 1, at: 0.3, deg: 50, segments: 1, size: 0.45 },
    ],
    shrink: 0.9,
    egg: 0.12,
    rings: 2,
    step: 0.74,
    branchWidth: 0.76,
    wander: 10,
  },
  finger: {
    length: 24,
    width: 11,
    chain: 2,
    branches: [
      { from: 0, at: 0.4, deg: -62, segments: 2, size: 1 },
      { from: 1, at: 0.3, deg: -36, segments: 2, size: 1 },
      { from: 1, at: 0.6, deg: 30, segments: 1, size: 0.8 },
    ],
    shrink: 0.92,
    egg: 0.08,
    rings: 4,
    step: 0.82,
    branchWidth: 0.8,
    wander: 10,
  },
  stout: {
    length: 22,
    width: 16,
    chain: 4,
    branches: [{ from: 2, at: 0.5, deg: -58, segments: 1, size: 0.85 }],
    shrink: 0.95,
    egg: 0.06,
    rings: 4,
    step: 0.66,
    branchWidth: 0.82,
    wander: 14,
  },
};

const turn = ([x, y]: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};

/** Half the segment's width at `along`, from -0.5 at its start to 0.5 at its end. */
const halfWidth = (width: number, fullness: number, along: number) =>
  (width / 2) * (1 - fullness * 2 * along) * Math.sqrt(Math.max(0, 1 - (2 * along) ** 2));

/**
 * A lumpy, egg-ish outline round the origin, long along x and fuller toward its start: blunt ends,
 * a flatter underside and a few bumps and dents, the way a real rhizome grows.
 */
function egg(length: number, width: number, fullness: number, rand: () => number): Pt[] {
  const [p1, p2, p3] = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const lumpy = 0.07 + rand() * 0.05;
  return Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * Math.PI * 2;
    const c = Math.cos(t);
    const blunt = Math.sign(c) * Math.abs(c) ** 0.7;
    const bumps = 1 + lumpy * Math.sin(3 * t + p1) + 0.05 * Math.sin(5 * t + p2) + 0.03 * Math.sin(8 * t + p3);
    const under = Math.sin(t) > 0 ? 0.86 : 1;
    const w = (width / 2) * (1 - fullness * c) * bumps * under * (1 + (rand() * 2 - 1) * 0.05);
    return [blunt * (length / 2) * (1 + (rand() * 2 - 1) * 0.04), Math.sin(t) * w];
  });
}

/** A ring across the segment: wavy, bowed toward the far end, and often not all the way round. */
function ringAt(length: number, width: number, fullness: number, along: number, rand: () => number): Pt[] {
  const half = halfWidth(width, fullness, along) * 0.95;
  const bow = half * 0.32;
  const [from, to] = [-1 + rand() * 0.35, 1 - rand() * 0.35];
  return Array.from({ length: 6 }, (_, i): Pt => {
    const s = from + ((to - from) * i) / 5;
    return [along * length + bow * (1 - s * s) + (rand() * 2 - 1) * 0.25, s * half];
  });
}

/** Short creases along the segment, as on dried, wrinkled skin. */
function wrinklesOf(length: number, width: number, fullness: number, rand: () => number): Pt[][] {
  return Array.from({ length: 3 }, () => {
    const along = -0.3 + rand() * 0.6;
    const side = (rand() * 2 - 1) * 0.7;
    const y = side * halfWidth(width, fullness, along);
    const len = length * (0.12 + rand() * 0.14);
    const x = along * length;
    return [
      [x - len / 2, y + (rand() * 2 - 1) * 0.8],
      [x, y + (rand() * 2 - 1) * 0.5],
      [x + len / 2, y + (rand() * 2 - 1) * 0.8],
    ];
  });
}

/** A few tiny dots scattered over the segment. */
function dotsOf(length: number, width: number, fullness: number, rand: () => number): Pt[] {
  return Array.from({ length: 2 + Math.floor(rand() * 3) }, () => {
    const along = -0.35 + rand() * 0.7;
    return [along * length, (rand() * 2 - 1) * 0.75 * halfWidth(width, fullness, along)];
  });
}

interface Raw {
  at: Pt;
  deg: number;
  dir: Pt;
  length: number;
  width: number;
  outline: Pt[];
  rings: Pt[][];
  wrinkles: Pt[][];
  dots: Pt[];
  tip: boolean;
}

/** A root lying flat on the counter: a chain of plump segments with stubby branches fanning off it. */
export function knobGeometry(shape: KnobShape, seed: number): KnobGeometry {
  const rand = rng(seed * 43 + 13);
  const spec = SPECS[shape];
  const raw: Raw[] = [];

  const grow = (at: Pt, deg: number, length: number, width: number, count: number, joint: boolean): number[] => {
    const made: number[] = [];
    let [pos, angle, l, w] = [at, deg, length, width];
    for (let i = 0; i < count; i++) {
      const rings = [
        ...(joint || i > 0 ? [ringAt(l, w, spec.egg, -0.4, rand)] : []),
        ...Array.from({ length: spec.rings }, (_, k) =>
          ringAt(l, w, spec.egg, -0.28 + ((k + 0.5 + (rand() * 2 - 1) * 0.3) / spec.rings) * 0.62, rand),
        ),
      ];
      const dir = turn([1, 0], angle);
      raw.push({
        at: pos,
        deg: angle,
        dir,
        length: l,
        width: w,
        outline: egg(l, w, spec.egg, rand),
        rings,
        wrinkles: wrinklesOf(l, w, spec.egg, rand),
        dots: dotsOf(l, w, spec.egg, rand),
        tip: i === count - 1,
      });
      made.push(raw.length - 1);
      pos = [pos[0] + dir[0] * l * spec.step, pos[1] + dir[1] * l * spec.step];
      angle += (rand() * 2 - 1) * spec.wander;
      l *= spec.shrink * (0.9 + rand() * 0.2);
      w *= spec.shrink * (0.94 + rand() * 0.12);
    }
    return made;
  };

  const main = grow([0, 0], -6 + (rand() * 2 - 1) * 8, spec.length, spec.width, spec.chain, false);
  for (const [n, br] of spec.branches.entries()) {
    /** Past the first two fingers, some roots simply didn't grow one. */
    if (n >= 2 && rand() < 0.3) continue;
    const parent = raw[main[Math.min(br.from, main.length - 1)]!]!;
    const along = br.at + (rand() * 2 - 1) * 0.08;
    const from: Pt = [parent.at[0] + parent.dir[0] * parent.length * along, parent.at[1] + parent.dir[1] * parent.length * along];
    const deg = parent.deg + br.deg + (rand() * 2 - 1) * 12;
    const off = turn([1, 0], deg);
    /** Starting inside the parent buries the base, so the finger looks fused on rather than stuck on. */
    const start: Pt = [from[0] + off[0] * parent.width * 0.12, from[1] + off[1] * parent.width * 0.12];
    grow(start, deg, parent.length * br.size * (0.85 + rand() * 0.3), parent.width * spec.branchWidth, br.segments, true);
  }

  /** A point in a segment's own frame (origin at its start, x along it) placed in shared space. */
  const place = (s: Raw, [x, y]: Pt): Pt => {
    const r = turn([x + s.length / 2, y], s.deg);
    return [s.at[0] + r[0], s.at[1] + r[1]];
  };
  const all = raw.flatMap((s) => s.outline.map((p) => place(s, p)));
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(84 / (r - l), 62 / (b - t));
  const fit = ([x, y]: Pt): Pt => [50 + (x - (l + r) / 2) * k, 52 + (y - (t + b) / 2) * k];

  const segments: Segment[] = raw.map((s) => ({
    center: fit(place(s, [0, 0])),
    dir: s.dir,
    length: s.length * k,
    width: s.width * k,
    path: smooth(s.outline.map((p) => fit(place(s, p))), true),
    rings: s.rings.map((ring) => ring.map((p) => fit(place(s, p)))),
    wrinkles: s.wrinkles.map((w) => w.map((p) => fit(place(s, p)))),
    dots: s.dots.map((p) => fit(place(s, p))),
    tip: s.tip,
    start: fit(place(s, [-s.length / 2, 0])),
    end: fit(place(s, [s.length / 2, 0])),
  }));
  const first = raw[0]!;
  const half = halfWidth(first.width, spec.egg, -0.43) * k;
  return {
    segments,
    cut: {
      at: fit(place(first, [-first.length * 0.43, 0])),
      rx: half * 0.42,
      ry: half * 0.92,
      deg: first.deg,
    },
    bottom: 52 + ((b - t) / 2) * k,
  };
}
