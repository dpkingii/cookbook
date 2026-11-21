import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { bbox, centroid, layFlat, place, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { BASIL, blade, bokchoyStalk, leaflet, mapPart, SPINACH, stalk, type LeafPart, type LeafShape } from "./leaf-shape";

/**
 * What cooks do with leaves. `leaves` picks them off the stems (or pulls bok choy apart); `ribbons` shreds them, as a
 * basil chiffonade or shredded cabbage; `torn` is a rough chop; `chopped` a fine one; `minced` finer still. `halved` and
 * `wedges` cut a bok choy or cabbage through its core.
 */
export type LeafCut = "halved" | "wedges" | "leaves" | "ribbons" | "torn" | "chopped" | "minced";

const HEADS: Record<Exclude<Cut, "whole">, LeafCut> = {
  halved: "halved",
  wedges: "wedges",
  strips: "ribbons",
  sliced: "ribbons",
  rings: "ribbons",
  diced: "chopped",
  minced: "minced",
};

export const LEAF_CUT: Record<LeafShape, Record<Exclude<Cut, "whole">, LeafCut>> = {
  cilantro: { halved: "leaves", wedges: "leaves", strips: "torn", sliced: "torn", rings: "torn", diced: "chopped", minced: "minced" },
  basil: { halved: "leaves", wedges: "leaves", strips: "ribbons", sliced: "ribbons", rings: "ribbons", diced: "chopped", minced: "minced" },
  spinach: { halved: "leaves", wedges: "leaves", strips: "ribbons", sliced: "ribbons", rings: "ribbons", diced: "torn", minced: "minced" },
  /** Bok choy is cut across into strips of stalk and leaf; pulled apart into stalks when the recipe says strips. */
  bokchoy: { halved: "halved", wedges: "wedges", strips: "leaves", sliced: "torn", rings: "torn", diced: "chopped", minced: "minced" },
  cabbage: HEADS,
};

export interface LeafCutResult {
  pieces: LeafPart[];
  heap: boolean;
}

/** Spreads n points over an ellipse, denser in the middle, as food falls in a pile. */
function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

const flat = (p: LeafPart, rot: number, x: number, y: number, squash = 0.8): LeafPart => {
  const [cx, cy] = centroid(p.outer);
  return mapPart(p, (q) => layFlat([[q[0] - cx, q[1] - cy]], rot, x, y, squash)[0]!);
};
/** Moves a group of parts as one, round the centre of the first. */
const flatAll = (parts: LeafPart[], rot: number, x: number, y: number, squash = 0.8): LeafPart[] => {
  const [cx, cy] = centroid(parts[0]!.outer);
  return parts.map((p) => mapPart(p, (q) => layFlat([[q[0] - cx, q[1] - cy]], rot, x, y, squash)[0]!));
};

/** A thin curled strip of leaf, as a closed outline round a wandering centre line. */
function ribbon(len: number, w: number, seed: number): Pt[] {
  const rand = rng(seed * 3 + 1);
  const curl = (rand() - 0.5) * 1.6;
  const phase = rand() * 6;
  const line = Array.from({ length: 10 }, (_, i): Pt => {
    const t = i / 9;
    return [t * len, Math.sin(t * Math.PI * (1 + curl) + phase) * len * 0.12];
  });
  const side = (s: number) =>
    line.map(([x, y], i): Pt => {
      const [a, b] = [line[Math.max(0, i - 1)]!, line[Math.min(9, i + 1)]!];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const ww = (w / 2) * (0.75 + 0.25 * Math.sin(i * 1.3 + seed)) * (i === 0 || i === 9 ? 0.7 : 1);
      return [x - ((b[1] - a[1]) / L) * ww * s, y + ((b[0] - a[0]) / L) * ww * s];
    });
  return [...side(1), ...side(-1).reverse()];
}

/** A torn or chopped scrap of leaf: an irregular few-sided piece. */
const scrap = (s: number, seed: number, sides = 6, wobble = 0.3): Pt[] => sampleClosed(ring(0, 0, s, s * 0.78, seed, wobble, sides), 2);

/** A halved head lying cut side up. A cabbage shows its layers, packed tight round a pale core; a bok choy its stalks fanning from the base into leaf. */
function face(shape: LeafShape, slim: number, seed: number): LeafPart {
  const rand = rng(seed * 61 + 3);
  if (shape === "cabbage") {
    const wedge = slim < 1;
    if (wedge) {
      /** A wedge's face is a sector, its point at the core and its curved back the outside of the head. */
      const R = 40;
      const span = 0.62;
      const arc = Array.from({ length: 15 }, (_, i): Pt => {
        const a = -span + (i / 14) * span * 2;
        return [Math.cos(a) * R, Math.sin(a) * R];
      });
      const outer = sampleClosed([[0, 0], ...arc], 2);
      const layers = Array.from({ length: 7 }, (_, j) => {
        const r = R * (0.32 + j * 0.095);
        return Array.from({ length: 9 }, (_, i): Pt => {
          const a = -span * 0.92 + (i / 8) * span * 1.84;
          const rr = r * (1 + 0.035 * Math.sin(i * 2.1 + j * 1.7 + seed));
          return [Math.cos(a) * rr, Math.sin(a) * rr];
        });
      });
      const core: Pt[] = [
        [1, 0],
        [13, -4],
        [17, 0],
        [13, 4],
      ];
      return { kind: "face", outer, thick: 9, tone: 0, layers, core, group: 0 };
    }
    const outer = sampleClosed(ring(0, 0, 40, 34, seed, 0.03, 14), 2);
    /** The layers run round the core, close together near it, wavier and broken further out. */
    const layers: Pt[][] = [];
    for (let j = 0; j < 9; j++) {
      const r = 0.2 + j * 0.088;
      const gap = rand() * 6.28;
      const pts = Array.from({ length: 30 }, (_, i): Pt => {
        const a = gap + 0.35 + (i / 29) * (Math.PI * 2 - 0.7);
        const w = 1 + 0.1 * Math.sin(a * (5 + (j % 4) * 2) + j * 1.3) * Math.min(1, r * 2.5);
        return [Math.cos(a) * 40 * r * w, 9 * (1 - r) + Math.sin(a) * 34 * r * w];
      });
      layers.push(pts);
    }
    const core: Pt[] = [
      [-6, 34],
      [-4, 10],
      [0, 2],
      [4, 10],
      [6, 34],
    ];
    return { kind: "face", outer, thick: 10, tone: 0, layers, core, group: 0 };
  }
  /** Bok choy, split lengthwise: the stalks stack in a fan from a solid base, then open into a band of leaf. */
  const L = 82;
  const w = (t: number) => (8 + 22 * t ** 0.9) * slim;
  const N = 16;
  const top = Array.from({ length: N + 1 }, (_, i): Pt => [(i / N) * L * 0.62, -w(i / N) / 2]);
  const bottom = top.map(([x, y]): Pt => [x, -y]).reverse();
  const leafy = blade({ len: L * 0.56, wid: 52 * slim, peak: 0.45, blunt: 0.5, crinkle: 0.05 }, seed).outline.map(([x, y]): Pt => [x + L * 0.5, y]);
  const pale = [...top, ...bottom];
  const layers = [-0.32, -0.12, 0.08, 0.28].map((f) =>
    Array.from({ length: 6 }, (_, i): Pt => {
      const t = 0.12 + (i / 5) * 0.86;
      return [t * L * 0.62, f * w(t)];
    }),
  );
  return { kind: "face", outer: pale, thick: 6 * slim + 3, tone: 0, layers, green: leafy, group: 0 };
}

export function cutLeaf(shape: LeafShape, cut: Exclude<Cut, "whole">, seed: number): LeafCutResult {
  const rand = rng(seed * 101 + 13);
  const wob = () => rand() * 2 - 1;
  const lc = LEAF_CUT[shape][cut];
  const herb = shape === "cilantro" || shape === "basil";
  switch (lc) {
    case "halved": {
      const f = face(shape, 1, seed);
      const other = face(shape, 1, seed + 1);
      if (shape === "cabbage")
        return { heap: false, pieces: [flat(f, -0.1 + wob() * 0.05, -21, -6, 0.75), { ...flat(other, 0.15 + wob() * 0.05, 22, 9, 0.75), group: 1 }] };
      return { heap: false, pieces: [flat(f, -0.08, 0, -15, 0.75), { ...flat(other, Math.PI + 0.06, 4, 16, 0.75), group: 1 }] };
    }
    case "wedges": {
      if (shape === "cabbage") {
        const pieces = Array.from({ length: 4 }, (_, i) => {
          const [col, row] = [i % 2, Math.floor(i / 2)];
          return { ...flat(face(shape, 0.5, seed + i), (col ? Math.PI : 0) + wob() * 0.15, (col - 0.5) * 38, (row - 0.5) * 26, 0.75), group: i };
        });
        return { heap: false, pieces };
      }
      const pieces = Array.from({ length: 4 }, (_, i) => ({ ...flat(face(shape, 0.5, seed + i), (i % 2 ? Math.PI : 0) + wob() * 0.05, (i % 2) * 6, (i - 1.5) * 17, 0.75), group: i }));
      return { heap: false, pieces };
    }
    case "leaves": {
      if (shape === "bokchoy") {
        /** Stalks pulled off the head, laid side by side head to tail. */
        return { heap: false, pieces: Array.from({ length: 4 }, (_, i) => flatAll(bokchoyStalk([0, 0], 0, 0.95, seed * 10 + i, i, -0.2 + i * 0.12), -0.12 + wob() * 0.06, i * 4, (i - 1.5) * 15, 0.85)).flat() };
      }
      if (shape === "cilantro") {
        /** Picked leaves: each leaflet with a little of its stem, scattered loosely. */
        const n = 13;
        const pieces = Array.from({ length: n }, (_, i): LeafPart[] => {
          const r = 7 + rand() * 2.5;
          const leaf = leaflet(r, seed * 50 + i);
          const stemEnd: Pt = [-4 - rand() * 3, wob()];
          const parts: LeafPart[] = [
            { kind: "stem", outer: [stemEnd, [stemEnd[0] * 0.5, stemEnd[1] * 0.3], [0, 0]], thick: 0.3, tone: 0, width: 0.9, group: i },
            { kind: "blade", outer: leaf, thick: 0.3, tone: wob() * 0.5, veins: [[[0, 0], [r * 0.9, 0]]], group: i },
          ];
          const [x, y] = golden(i, n, 30, 22);
          const rot = rand() * 6.28;
          return parts.map((p) => mapPart(p, (q) => layFlat([q], rot, x, y, 0.85)[0]!));
        });
        return { heap: false, pieces: pieces.flat() };
      }
      const spec = shape === "basil" ? BASIL : SPINACH;
      const n = shape === "basil" ? 9 : 7;
      const pieces = Array.from({ length: n }, (_, i): LeafPart[] => {
        const b = blade({ ...spec, curl: wob() * 0.5, len: spec.len * (0.8 + rand() * 0.35) }, seed * 20 + i);
        const parts: LeafPart[] = [{ kind: "blade", outer: b.outline, thick: 0.5, tone: wob() * 0.4, veins: [b.mid, ...b.veins], group: i }];
        if (shape === "spinach") parts.unshift({ kind: "stem", outer: [[-9, wob()], [-4, 0], [1, 0]], thick: 0.5, tone: 0, width: 2.2, group: i });
        const [x, y] = golden(i, n, shape === "basil" ? 22 : 26, shape === "basil" ? 16 : 18);
        const rot = rand() * 6.28;
        return parts.map((p) => mapPart(p, (q) => layFlat([[q[0] - spec.len * 0.4, q[1]]], rot, x, y, 0.85)[0]!));
      });
      return { heap: false, pieces: pieces.flat() };
    }
    case "ribbons": {
      /** A chiffonade of basil, shredded spinach or cabbage: thin curling strips heaped loosely. */
      const cab = shape === "cabbage";
      const n = cab ? 46 : shape === "basil" ? 30 : 32;
      const w = cab ? 1.25 : shape === "basil" ? 1.8 : 2.6;
      const pieces = Array.from({ length: n }, (_, i): LeafPart => {
        const len = (cab ? 20 : 15) * (0.75 + rand() * 0.5);
        const [x, y] = golden(i, n, cab ? 26 : 22, cab ? 16 : 14);
        const r = Math.hypot(x / 26, y / 16);
        /** Shredded cabbage is mostly the pale inner leaves, with an odd green strip from the outside. */
        const pale = cab ? (rand() < 0.75 ? 0.85 : 0.1) : 0;
        return { ...flat({ kind: "blade", outer: ribbon(len, w, seed * 7 + i), thick: 0.6, tone: wob() * 0.35, pale, group: i }, rand() * 6.28, x, y - (1 - r) * 4), group: i };
      });
      return { heap: true, pieces };
    }
    case "torn":
    case "chopped":
    case "minced": {
      const fine = lc === "minced";
      const coarse = lc === "torn";
      const size = fine ? 1.1 : herb ? (coarse ? 4.2 : 2.2) : coarse ? 7 : 4;
      const n = fine ? 140 : herb ? (coarse ? 30 : 60) : coarse ? 18 : 34;
      const stalky = shape === "bokchoy" || shape === "cabbage";
      const pieces = Array.from({ length: n }, (_, i): LeafPart => {
        const [x, y] = golden(i, n, fine ? 18 : coarse ? 26 : 22, fine ? 11 : coarse ? 17 : 14);
        const r = Math.hypot(x / 22, y / 14);
        const s = size * (0.8 + rand() * 0.4);
        /** Bok choy chops into crescents of white stalk and pieces of leaf; cabbage into pale squares with green edges. */
        if (shape === "bokchoy" && !fine && i % 2 === 0) {
          const st = stalk(s * 0.9, s * 1.5, s * 1.6, seed + i).outline;
          return { ...flat({ kind: "blade", outer: st, thick: s * 0.35, tone: wob() * 0.3, pale: 1, group: i }, rand() * 6.28, x, y - (1 - r) * 3), group: i };
        }
        const piece = coarse && !stalky ? scrap(s, seed + i * 3, 7, 0.32) : scrap(s, seed + i * 3, fine ? 5 : 5, fine ? 0.3 : 0.22);
        const vein: Pt[][] | undefined = !fine && s > 3 ? [[[-s * 0.8, wob()], [s * 0.8, wob()]]] : undefined;
        const part: LeafPart = { kind: "blade", outer: piece, thick: 0.5, tone: wob() * 0.45, pale: shape === "cabbage" ? (rand() < 0.7 ? 0.8 : 0.15) : 0, veins: vein, group: i };
        return { ...flat(part, rand() * 6.28, x, y - (1 - r) * (fine ? 2 : 3)), group: i };
      });
      /** Chopped herbs carry a few bits of stem. */
      if (herb && !fine)
        for (let i = 0; i < (coarse ? 6 : 10); i++) {
          const [x, y] = golden(i * 5 + 2, n, 20, 12);
          const L = size * (0.8 + rand() * 0.6);
          pieces.push({ kind: "stem", outer: place([[0, 0], [L / 2, wob() * 0.3], [L, 0]], [0, 0], rand() * 360, x, y), thick: 0.3, tone: 0, width: shape === "basil" ? 1.2 : 0.9, group: n + i });
        }
      return { heap: true, pieces };
    }
  }
}

const area = (p: LeafPart) => {
  const b = bbox(p.outer);
  return b.w * b.h;
};

/** The piece a scene would scatter: the biggest piece with its stem, or a little cluster of the small stuff. */
export function representativeLeaf(result: LeafCutResult, shape: LeafShape, cut: Exclude<Cut, "whole">): LeafPart[] {
  const lc = LEAF_CUT[shape][cut];
  if (lc === "minced" || (lc === "chopped" && shape !== "bokchoy")) {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: LeafPart) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].filter((p) => p.kind !== "stem").sort((a, b) => near(a) - near(b)).slice(0, lc === "minced" ? 12 : 5);
  }
  const best = result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a));
  return result.pieces.filter((p) => p.group === best.group);
}

/**
 * Heat wilts leaves: they shrink and crumple, spinach most of all, each leaf drawing in toward its own stem. Bok choy
 * and cabbage keep their shape and just soften.
 */
export function wilt(shape: LeafShape, parts: LeafPart[], seed: number): LeafPart[] {
  const heads = shape === "bokchoy" || shape === "cabbage";
  const centres = new Map<number, Pt>();
  for (const g of new Set(parts.map((p) => p.group))) centres.set(g, centroid(parts.filter((p) => p.group === g).flatMap((p) => p.outer)));
  return parts.map((p, n) => {
    const k = p.kind === "face" ? 0.96 : shape === "spinach" ? 0.7 : heads ? 0.93 : 0.82;
    const [cx, cy] = centres.get(p.group)!;
    const q = mapPart(p, ([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
    if (p.kind !== "blade") return { ...q, thick: p.thick * 0.8 };
    /** A slow wave round the edge, not a saw: a wilted leaf ruckles, it doesn't grow teeth. */
    const amp = Math.sqrt(area(p)) * (heads ? 0.02 : 0.04);
    const m = q.outer.length;
    const ph = seed + n * 1.7;
    return {
      ...q,
      outer: q.outer.map(([x, y], i): Pt => [x + Math.sin((i / m) * Math.PI * 14 + ph) * amp, y + Math.cos((i / m) * Math.PI * 10 + ph) * amp]),
      thick: p.thick * 0.8,
    };
  });
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameLeaf(shape: LeafShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutLeaf(shape, cut, seed);
  const picked = layout === "piece" ? representativeLeaf(result, shape, cut) : result.pieces;
  const drawn = cooked ? wilt(shape, picked, seed) : picked;
  /** A cut bok choy's leafy end reaches past its pale stalks, so it is framed too. */
  return { result, ...frameCut(drawn, layout === "piece" ? 6 : 1.5, drawn.flatMap((p) => p.green ?? [])) };
}
