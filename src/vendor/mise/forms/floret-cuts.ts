import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { centroid, layFlat, sampleClosed } from "../core/geometry";
import { ring, rng, type Pt } from "../core/rough";
import { hull, lobe, type FloretShape } from "./floret-shape";

/**
 * What cooks do with broccoli and cauliflower: break it into florets (large, or bite-size for diced), halve the head or
 * slice it into steaks to show the branching inside, rice it, and cut the peeled stalk into batons or coins.
 */
export type FloretCut = "halved" | "steaks" | "florets" | "bites" | "riced" | "batons" | "coins";

export const FLORET_CUT: Record<Exclude<Cut, "whole">, FloretCut> = {
  halved: "halved",
  sliced: "steaks",
  wedges: "florets",
  diced: "bites",
  minced: "riced",
  strips: "batons",
  rings: "coins",
};

export interface FloretPiece {
  /** The piece's outline for framing, shadows and measuring: the hull of a floret, or the edge of a flat piece. */
  outer: Pt[];
  thick: number;
  kind: "floret" | "face" | "stem" | "crumb";
  /** A floret's bud clusters, back to front. */
  lobes?: Pt[][];
  /** A floret's stem, and the branches running from it into the lobes. */
  stem?: Pt[];
  branches?: Pt[][];
  /** A cut face: the band of buds along its domed edge, and the branching stem inside it. */
  crown?: Pt[];
  veins?: Pt[][];
  /** The pale ring inside a stalk coin. */
  core?: Pt[];
}

export interface FloretCutResult {
  pieces: FloretPiece[];
  heap: boolean;
}

type Parts = Omit<FloretPiece, "thick" | "kind">;

function moved(p: Parts, rot: number, x: number, y: number, squash = 0.82): Parts {
  const [cx, cy] = centroid(p.outer);
  const go = (q: Pt[]) => layFlat(q.map(([px, py]): Pt => [px - cx, py - cy]), rot, x, y, squash);
  return {
    outer: go(p.outer),
    lobes: p.lobes?.map(go),
    stem: p.stem && go(p.stem),
    branches: p.branches?.map(go),
    crown: p.crown && go(p.crown),
    veins: p.veins?.map(go),
    core: p.core && go(p.core),
  };
}

/** One floret standing up: a short stem forking into a little dome of bud clusters. `s` is the dome's radius. */
function floret(shape: FloretShape, s: number, seed: number): Parts {
  const rand = rng(seed * 17 + 7);
  const n = shape === "cauliflower" ? 6 : 5;
  const centres: [number, number, number][] = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI + ((i + 0.5) / n) * Math.PI + (rand() - 0.5) * 0.25;
    const d = s * (0.5 + rand() * 0.1);
    return [Math.cos(a) * d, -s * 0.5 + Math.sin(a) * d * 0.75, s * (0.4 + rand() * 0.12)];
  });
  centres.push([(rand() - 0.5) * s * 0.2, -s * 0.62, s * 0.5]);
  /** The lowest lobes are nearest the eye and are drawn last. */
  centres.sort((a, b) => a[1] - b[1]);
  const lobes = centres.map(([x, y, r], i) => lobe(x, y, r, seed * 31 + i, shape === "cauliflower" ? 8 : 10));
  /** A floret's stem is short and thick, flaring where it meets the buds, never a lollipop stick. */
  const w = s * (shape === "cauliflower" ? 0.62 : 0.7);
  const len = s * (0.45 + rand() * 0.25);
  const stem: Pt[] = sampleClosed(
    [
      [-w * 0.75, -s * 0.35],
      [w * 0.75, -s * 0.35],
      [w * 0.45, len * 0.45],
      [w * 0.4, len],
      [-w * 0.4, len],
      [-w * 0.45, len * 0.45],
    ],
    2,
  );
  const branches = centres.slice(0, -1).map(([x, y]): Pt[] => [
    [0, -s * 0.2],
    [x * 0.5, (y - s * 0.2) / 2],
    [x * 0.85, y + s * 0.15],
  ]);
  return { outer: hull([...lobes.flat(), ...stem]), lobes, stem, branches };
}

/** A head cut through its middle: the domed crown band of buds, the pale flesh inside, and the stem branching up into it. */
function face(shape: FloretShape, R: number, seed: number, slim = 1): Parts {
  const rand = rng(seed * 23 + 3);
  const cauli = shape === "cauliflower";
  const knobs = cauli ? 9 : 13;
  const dome = Array.from({ length: 40 }, (_, i): Pt => {
    const a = -Math.PI + (i / 39) * Math.PI;
    const r = R * slim * (1 + 0.055 * Math.abs(Math.sin((a * knobs) / 1.2 + seed)) + (rand() - 0.5) * 0.02);
    return [Math.cos(a) * r, Math.sin(a) * r * 0.82];
  });
  /** The stalk flares up into the dome, so a cut head is a fan, not a mushroom. */
  const sw = R * (cauli ? 0.38 : 0.34) * slim;
  const base = R * (cauli ? 0.48 : 0.62);
  const outer: Pt[] = [...dome, [R * slim * 0.7, R * 0.12], [sw * 1.15, R * 0.3], [sw, base], [-sw, base], [-sw * 1.15, R * 0.3], [-R * slim * 0.7, R * 0.12]];
  const band = cauli ? 0.62 : 0.66;
  /** The band's inner edge is knobbly too: each floret's buds reach down a little way into the flesh. */
  const inner = dome
    .map(([x, y], i): Pt => {
      const k = band + 0.06 * Math.sin(i * 1.7 + seed) + 0.04 * Math.sin(i * 0.9);
      return [x * k, y * k - R * 0.02];
    })
    .reverse();
  const crown = [...dome, ...inner];
  const nv = cauli ? 7 : 5;
  const veins = Array.from({ length: nv }, (_, i): Pt[] => {
    const a = -Math.PI + ((i + 0.5) / nv) * Math.PI;
    const tip: Pt = [Math.cos(a) * R * band * slim * 0.92, Math.sin(a) * R * band * 0.8];
    return [
      [0, base * 0.95],
      [0, R * 0.05],
      [tip[0] * 0.45, tip[1] * 0.35],
      tip,
    ];
  });
  return { outer, crown, veins };
}

function block(l: number, w: number, seed: number): Parts {
  const rand = rng(seed * 19 + 5);
  const j = () => (rand() - 0.5) * w * 0.2;
  return {
    outer: [
      [-l / 2 + j(), -w / 2 + j()],
      [l / 2 + j(), -w / 2 + j()],
      [l / 2 + j(), w / 2 + j()],
      [-l / 2 + j(), w / 2 + j()],
    ],
  };
}

const golden = (i: number, n: number, rx: number, ry: number): Pt => {
  const a = i * 2.39996;
  const d = Math.sqrt((i + 0.5) / n);
  return [Math.cos(a) * rx * d, Math.sin(a) * ry * d];
};

export function cutFloret(shape: FloretShape, cut: Exclude<Cut, "whole">, seed: number): FloretCutResult {
  const rand = rng(seed * 47 + 19);
  const wob = () => rand() * 2 - 1;
  /** Florets lie on their sides, crowns pointing every which way. */
  const lying = () => (rand() < 0.5 ? -1 : 1) * (1.1 + rand() * 0.6) + wob() * 0.2;

  switch (FLORET_CUT[cut]) {
    case "florets": {
      const pieces = Array.from({ length: 5 }, (_, i) => {
        const [col, row] = [i % 3, Math.floor(i / 3)];
        return { ...moved(floret(shape, 10.5 + rand() * 2, seed + i), lying(), (col - 1) * 24 + row * 11 + wob() * 2, (row - 0.5) * 20 + wob() * 2), thick: 1.5, kind: "floret" as const };
      });
      return { heap: false, pieces };
    }
    case "bites": {
      const n = 14;
      const pieces = Array.from({ length: n }, (_, i) => {
        const [x, y] = golden(i, n, 24, 15);
        return { ...moved(floret(shape, 5.8 + rand() * 1.4, seed + i), lying(), x, y), thick: 1, kind: "floret" as const };
      });
      return { heap: true, pieces: pieces.sort((a, b) => centroid(a.outer)[1] - centroid(b.outer)[1]) };
    }
    case "halved": {
      const R = 22;
      const h = face(shape, R, seed);
      const mirror = (p: Pt[]) => p.map(([x, y]): Pt => [-x, y]);
      const other: Parts = { outer: mirror(h.outer), crown: h.crown && mirror(h.crown), veins: h.veins?.map(mirror) };
      return {
        heap: false,
        pieces: [
          { ...moved(h, -0.15 + wob() * 0.05, -R * 0.95, 0), thick: 6, kind: "face" },
          { ...moved(other, 0.15 + wob() * 0.05, R * 0.95, 2), thick: 6, kind: "face" },
        ],
      };
    }
    case "steaks": {
      /** Slabs cut straight down through the head: the middle ones whole, the outer ones smaller. */
      const pieces = [0.82, 1, 0.9].map((k, i) => ({
        ...moved(face(shape, 17 * k, seed + i, 0.95), wob() * 0.08, (i - 1) * 30, wob() * 2),
        thick: 3.2,
        kind: "face" as const,
      }));
      return { heap: false, pieces };
    }
    case "riced": {
      const n = 150;
      const pieces = Array.from({ length: n }, (_, i) => {
        const [x, y] = golden(i, n, 22, 13);
        const s = 0.9 + rand() * 0.6;
        const r = Math.hypot(x / 22, y / 13);
        return { outer: sampleClosed(ring(x, y - (1 - r) * 3, s, s * (0.7 + rand() * 0.3), seed + i, 0.25, 5), 2), thick: 0.8, kind: "crumb" as const };
      });
      return { heap: true, pieces };
    }
    case "batons": {
      const n = 12;
      const pieces = Array.from({ length: n }, (_, i) => {
        const [x, y] = golden(i, n, 12, 11);
        return { ...moved(block(18 + rand() * 6, 2.6 + rand() * 0.6, seed + i), 0.3 + wob() * 0.35, x, y), thick: 2, kind: "stem" as const };
      });
      return { heap: true, pieces };
    }
    case "coins": {
      const pieces = Array.from({ length: 9 }, (_, i) => {
        const r = 4.2 * (0.9 + rand() * 0.2);
        const outer = sampleClosed(ring(0, 0, r, r * 0.94, seed + i, 0.05, 9), 3);
        const core = sampleClosed(ring(0, 0, r * 0.62, r * 0.58, seed + i + 50, 0.08, 7), 3);
        const [col, row] = [i % 5, Math.floor(i / 5)];
        return { ...moved({ outer, core }, wob() * 0.3, (col - 2) * 9.5 + row * 4, row * 11 + wob()), thick: 1.6, kind: "stem" as const };
      });
      return { heap: false, pieces };
    }
  }
}

/** The piece a scene would scatter: one floret, one steak or half, or a small cluster of rice. */
export function representativeFloret(result: FloretCutResult, cut: Exclude<Cut, "whole">): FloretPiece[] {
  if (FLORET_CUT[cut] === "riced") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: FloretPiece) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 12);
  }
  const area = (p: FloretPiece) => {
    const xs = p.outer.map((q) => q[0]);
    const ys = p.outer.map((q) => q[1]);
    return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
  };
  return [result.pieces.reduce((a, b) => (area(b) > area(a) ? b : a))];
}

/** Cooked florets soften and shrink a little. */
export function softenFloret(p: FloretPiece): FloretPiece {
  const [cx, cy] = centroid(p.outer);
  const s = (q: Pt[]) => q.map(([x, y]): Pt => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.93]);
  return {
    ...p,
    outer: s(p.outer),
    lobes: p.lobes?.map(s),
    stem: p.stem && s(p.stem),
    branches: p.branches?.map(s),
    crown: p.crown && s(p.crown),
    veins: p.veins?.map(s),
    core: p.core && s(p.core),
    thick: p.thick * 0.85,
  };
}

/** The pieces as drawn for this cut and layout, cooked or not, and the zoom that fits them in the box. */
export function frameFloret(shape: FloretShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutFloret(shape, cut, seed);
  const picked = layout === "piece" ? representativeFloret(result, cut) : result.pieces;
  return { result, ...frameCut(cooked ? picked.map(softenFloret) : picked, layout === "piece" ? 6 : 1.5) };
}
