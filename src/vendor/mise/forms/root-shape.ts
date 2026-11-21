import type { ArtProps } from "../core/Art";
import { sampleClosed } from "../core/geometry";
import type { Cut, Layout } from "../core/cut";
import { ring, rng, type Pt } from "../core/rough";
import { along, line, outlineOf } from "./stalk-shape";

/**
 * Carrot: a long taproot tapering to a whiskered point, ringed with shallow creases. Daikon: a thick white cylinder
 * that blunts at the tip and greens at the shoulder. Potato: a lumpy oval tuber dotted with eyes.
 */
export type RootShape = "carrot" | "daikon" | "potato";

export interface RootProps extends ArtProps {
  /** Colour of the skin. */
  color: string;
  /** Colour of the cut flesh. Defaults to a paler, brighter version of the skin for carrot, white for daikon, pale yellow for potato. */
  flesh?: string;
  /** Colour of a carrot's inner core, seen across a coin. Defaults to a yellower version of the flesh. */
  core?: string;
  /** Colour of a daikon's sunlit shoulder, near the crown. */
  shoulder?: string;
  shape?: RootShape;
  /** A carrot with its feathery leaves still on, as sold in bunches. */
  tops?: boolean;
  /** Peeled: no skin left on the whole root or round the edge of a cut. */
  peeled?: boolean;
  /** Sliced and rings are coins; strips are matchsticks or, for potato, batons; wedges are roll-cut chunks, potato wedges or daikon half-moons. */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: carrot glossy and deeper orange, potato golden, daikon gone translucent, browned as far as `browning` says. */
  cooked?: boolean;
  /** Colour of the cooked flesh before any browning. */
  cookedColor?: string;
  /** 0 is just tender, 0.5 roasted golden at the edges, 1 dark and crisp. */
  browning?: number;
  seed?: number;
}

export const SKIN: Record<RootShape, string> = { carrot: "#e8742a", daikon: "#f1eee3", potato: "#b8875a" };
export const FLESH: Record<RootShape, string> = { carrot: "#f28a33", daikon: "#f8f6ef", potato: "#f3df9c" };
export const SHOULDER = "#b9cf8a";

export interface RootGeometry {
  /** The silhouette, closed. */
  outline: Pt[];
  /** A tube's axis and its width along it (carrot, daikon). A potato has none. */
  spine?: Pt[];
  widths?: number[];
  /** Shallow creases across a carrot or daikon, as open arcs. */
  rings: Pt[][];
  /** Fine root hairs, as open lines. */
  hairs: Pt[][];
  /** The cut-off leaf stems at the crown, or the full fronds when `tops` is on. */
  stems: Pt[][];
  leaflets: Pt[][];
  /** The crown, seen end-on. */
  crown?: { at: Pt; rx: number; ry: number; deg: number };
  /** A potato's eyes: small dents, each with the bud sitting in it. */
  eyes: { at: Pt; deg: number; r: number }[];
  /** Freckles in the skin: lenticels on a potato, pores on a daikon. */
  specks: Pt[];
  from: Pt;
  to: Pt;
  bottom: number;
}

const ramp = (t: number, a: number, b: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** A crease straight across a tube at fraction `t`, bowed a little toward the tip, covering part of the width. */
function crease(spine: Pt[], widths: number[], t: number, from: number, to: number, bow: number): Pt[] {
  const i = Math.round(t * (spine.length - 1));
  const at = (s: number) => along(spine, widths, s, t, t)[0]!;
  const a = spine[Math.max(0, i - 1)]!;
  const b = spine[Math.min(spine.length - 1, i + 1)]!;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [dx, dy] = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  return Array.from({ length: 7 }, (_, j) => {
    const s = from + ((to - from) * j) / 6;
    const p = at(s);
    const k = bow * (1 - s * s) * widths[i]!;
    return [p[0] + dx * k, p[1] + dy * k];
  });
}

function tubeRoot(shape: "carrot" | "daikon", seed: number, tops: boolean) {
  const rand = rng(seed * 61 + 23);
  const wob = () => rand() * 2 - 1;
  const deg = -12 + wob() * 4;
  const carrot = shape === "carrot";
  const L = carrot ? 92 : 100;
  const spine = line([0, 0], deg, L, wob() * (carrot ? 2.5 : 1.5), 0, 40);
  const W = carrot ? 19 + wob() : 23 + wob();
  const widths = spine.map((_, i) => {
    const t = i / (spine.length - 1);
    /** A rounded shoulder at the crown, so the root doesn't start as a flat-cut tube. */
    const shoulder = Math.sqrt(Math.min(1, 0.3 + t / 0.06));
    /** A carrot stays full through its upper half and narrows fast toward the tip, not a straight cone. */
    const body = carrot
      ? (1 - 0.93 * t ** 1.7) * (1 - 0.12 * t) + 0.025 * Math.sin(t * 9 + seed)
      : (1 + 0.04 * Math.sin(Math.PI * t)) * (1 - 0.9 * ramp(t, 0.62, 1) ** 1.4);
    return Math.max(0.8, W * shoulder * body);
  });
  const outline = sampleClosed(outlineOf(spine, widths, "round", "round"), 1);
  const tip = spine[spine.length - 1]!;
  /** The thread of taproot running on past the tip. */
  const tail: Pt[] = line(tip, deg + wob() * 12, carrot ? 9 + rand() * 6 : 6, wob() * 2, 0, 6);
  const rings = Array.from({ length: carrot ? 13 : 5 }, () => {
    const t = 0.08 + rand() * 0.8;
    const from = -0.9 + rand() * 0.4;
    return crease(spine, widths, t, from, from + 0.4 + rand() * 0.6, 0.12);
  });
  /** Hairs leave from some creases, out past the edge on the lower side. */
  const hairs = [
    tail,
    ...Array.from({ length: carrot ? 7 : 4 }, () => {
      const t = 0.15 + rand() * 0.75;
      const side = rand() < 0.65 ? 1 : -1;
      const p = along(spine, widths, side, t, t)[0]!;
      const a = ((deg + side * (70 + wob() * 25)) * Math.PI) / 180;
      const len = 3 + rand() * (carrot ? 5 : 3);
      return [p, [p[0] + Math.cos(a) * len * 0.5 + wob(), p[1] + Math.sin(a) * len * 0.5], [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len + wob()]] as Pt[];
    }),
  ];
  const root = spine[0]!;
  /** The crown sits just inside the shoulder: a low dome the stems rise from, not an open end. */
  const crown = { at: along(spine, widths, 0, 0.012, 0.012)[0]!, rx: W * 0.1, ry: widths[0]! * 0.3, deg };
  const stems: Pt[][] = [];
  const leaflets: Pt[][] = [];
  const back = deg + 180;
  if (tops && carrot) {
    /** Feathery fronds: a few long stems fanning back from the crown, each with tufts of fine leaflets. */
    for (let i = 0; i < 5; i++) {
      const stem = line(root, back + (i - 2) * 13 + wob() * 4, 44 + rand() * 14, wob() * 4, -6 - i * 1.5, 16);
      stems.push(stem);
      for (let j = 5; j < stem.length; j += 2) {
        const [x, y] = stem[j]!;
        for (const side of [-1, 1]) {
          const a = ((back + (i - 2) * 13 + side * (40 + rand() * 20)) * Math.PI) / 180;
          const len = 4 + rand() * 3;
          leaflets.push(sampleClosed(ring(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, len * 0.5, len * 0.18, seed + i * 31 + j, 0.2, 5), 2));
        }
      }
    }
  } else {
    /** Trimmed stems, a few short stubs. */
    for (let i = 0; i < (carrot ? 4 : 5); i++) stems.push(line(root, back + (i - 1.5) * 16 + wob() * 6, carrot ? 6 + rand() * 4 : 8 + rand() * 5, wob(), 0, 5));
  }
  const specks = carrot
    ? []
    : Array.from({ length: 26 }, () => {
        const t = 0.1 + rand() * 0.75;
        return along(spine, widths, wob() * 0.8, t, t)[0]!;
      });
  return { outline, spine, widths, rings, hairs, stems, leaflets, crown, specks, eyes: [], from: root, to: tip };
}

function potato(seed: number) {
  const rand = rng(seed * 67 + 29);
  const wob = () => rand() * 2 - 1;
  const [rx, ry] = [44 + wob() * 4, 29 + wob() * 3];
  const tilt = wob() * 0.12;
  /** Lumpy: a couple of broad bulges and dents on an oval, never a clean ellipse. */
  const [p1, p2, p3] = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const outline = Array.from({ length: 64 }, (_, i): Pt => {
    const a = (i / 64) * Math.PI * 2;
    const r = 1 + 0.06 * Math.sin(2 * a + p1) + 0.04 * Math.sin(3 * a + p2) + 0.025 * Math.sin(5 * a + p3);
    const [x, y] = [Math.cos(a) * rx * r, Math.sin(a) * ry * r * (1 - 0.08 * Math.cos(a))];
    return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
  });
  const inside = (u: number, v: number): Pt => {
    const [x, y] = [u * rx, v * ry];
    return [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
  };
  /** Eyes sit mostly near the ends and edges, where the buds grow. */
  const eyes = Array.from({ length: 6 + Math.floor(rand() * 3) }, () => {
    const a = rand() * Math.PI * 2;
    const d = 0.45 + rand() * 0.42;
    return { at: inside(Math.cos(a) * d, Math.sin(a) * d * 0.85), deg: (a * 180) / Math.PI + 90 + wob() * 20, r: 1.6 + rand() * 1.2 };
  });
  const specks = Array.from({ length: 70 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.9;
    return inside(Math.cos(a) * d, Math.sin(a) * d);
  });
  return { outline, rings: [], hairs: [], stems: [], leaflets: [], specks, eyes, from: inside(-1, 0), to: inside(1, 0) };
}

/** A whole root lying on the counter: carrot and daikon crown to the left, sloping gently down to the tip. */
export function rootGeometry(shape: RootShape, seed: number, tops = false): RootGeometry {
  const g: Omit<RootGeometry, "bottom"> = shape === "potato" ? potato(seed) : tubeRoot(shape, seed, tops);
  const all = [...g.outline, ...g.hairs.flat(), ...g.stems.flat(), ...g.leaflets.flat()];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(86 / (r - l), (shape === "potato" ? 70 : 62) / (b - t));
  const fit = ([x, y]: Pt): Pt => [50 + (x - (l + r) / 2) * k, 52 + (y - (t + b) / 2) * k];
  const go = (p: Pt[]) => p.map(fit);
  return {
    outline: go(g.outline),
    spine: g.spine && go(g.spine),
    widths: g.widths?.map((w) => w * k),
    rings: g.rings.map(go),
    hairs: g.hairs.map(go),
    stems: g.stems.map(go),
    leaflets: g.leaflets.map(go),
    crown: g.crown && { at: fit(g.crown.at), rx: g.crown.rx * k, ry: g.crown.ry * k, deg: g.crown.deg },
    eyes: g.eyes.map((e) => ({ ...e, at: fit(e.at), r: e.r * k })),
    specks: go(g.specks),
    from: fit(g.from),
    to: fit(g.to),
    bottom: Math.max(...go(g.outline).map((p) => p[1])),
  };
}
