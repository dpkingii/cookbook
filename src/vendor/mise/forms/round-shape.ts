import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/**
 * Tomato: a squat, gently lobed globe under a star of green sepals. Citrus: a round orange, lime or grapefruit with
 * a pitted peel. Lemon: an oval lying on its side, pointed at both ends. Apple: broad shoulders over a narrower base,
 * the stem sunk in a hollow.
 */
export type RoundShape = "tomato" | "citrus" | "lemon" | "apple";

export interface RoundProps extends ArtProps {
  /** Colour of the skin or peel. */
  color: string;
  /** Colour of the flesh inside. */
  flesh?: string;
  /** A second skin colour washed over part of the fruit: an apple's red streaks, a tomato's green shoulders, a blood orange's flush. */
  blush?: string;
  shape?: RoundShape;
  /** A leaf on the stem, as on a picked apple. */
  leaf?: boolean;
  /**
   * Halved shows the cross-section (an apple splits through its core). Sliced is rounds, wheels or, for apple, thin
   * crescents. Rings is apple rings, cored. Strips is tomato fillets, apple matchsticks or citrus peel. Minced citrus is zest.
   */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: tomatoes roast and blister, citrus grills, apples bake soft and golden. */
  cooked?: boolean;
  /** Colour of the cooked flesh before browning. */
  cookedColor?: string;
  /** 0 is just softened, 0.5 roasted or grilled, 1 blackened. */
  browning?: number;
  seed?: number;
}

/** How far the drawing looks down on the fruit, so its top shows. */
const VIEW: Record<RoundShape, number> = { tomato: 0.5, citrus: 0.42, lemon: 0.3, apple: 0.44 };

type V3 = [number, number, number];

/** A surface point at `t` from the stem end (0) to the blossom end (1), round the axis by `phi`. */
function surface(shape: RoundShape, lobe: number, t: number, phi: number): V3 {
  const s = Math.sin(Math.PI * t);
  const c = Math.cos(Math.PI * t);
  switch (shape) {
    case "tomato": {
      const rho = 35 * s * (1 + 0.04 * Math.cos(5 * phi + lobe) * s * s);
      const h = 27 * c - 3.5 * Math.exp(-((t / 0.16) ** 2));
      return [rho * Math.cos(phi), h, rho * Math.sin(phi)];
    }
    case "citrus": {
      const rho = 33 * s * (1 + 0.012 * Math.cos(3 * phi + lobe));
      return [rho * Math.cos(phi), 31.5 * c - 1.2 * Math.exp(-((t / 0.1) ** 2)), rho * Math.sin(phi)];
    }
    case "apple": {
      const rho = 34 * s ** 0.95 * (1 + 0.1 * c) * (1 + 0.03 * Math.cos(5 * phi + lobe) * t * t);
      const h = 29 * c - 7 * Math.exp(-((t / 0.2) ** 2)) + 3 * Math.exp(-(((1 - t) / 0.14) ** 2));
      return [rho * Math.cos(phi), h, rho * Math.sin(phi)];
    }
    case "lemon": {
      /** Lying on its side, axis left to right: the pointed blossom end on the right, a smaller nub at the stem end. */
      const x = -35 * c + 5.5 * Math.exp(-(((1 - t) / 0.09) ** 2)) - 2.6 * Math.exp(-((t / 0.08) ** 2));
      const rho = 25 * s ** 0.8;
      return [x, rho * Math.cos(phi), rho * Math.sin(phi)];
    }
  }
}

export interface RoundGeometry {
  /** Outline control points, drawn as a closed Catmull-Rom curve. */
  pts: Pt[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  bottom: number;
  /** The stem end, where the calyx, stem or button sits. */
  crown: Pt;
  /** Whether the stem end faces the viewer (it does, from above), or sits at the side as on a lemon. */
  crownFacing: number;
  /** The stem: a short run of points up from the crown. */
  stem: Pt[];
  /** Grooves between the lobes, running down from the crown. */
  ribs: Pt[][];
  /** The tomato's green calyx: pointed sepals lying on the fruit's top. */
  sepals: Pt[][];
  /** Lines running stem to base round the whole fruit, as an apple's streaks; each with a 0–1 weight. */
  meridians: { line: Pt[]; w: number }[];
  /** The hollow an apple's stem sits in. */
  hollow: Pt[];
  /** Dots on the skin: an apple's lenticels, a citrus's oil glands. `face` is how squarely each one faces the viewer. */
  dots: { at: Pt; face: number }[];
  /** Turns a surface point into the drawing, and says how much it faces the viewer (below 0 is out of sight). */
  project: (t: number, phi: number, lift?: number) => { at: Pt; z: number };
}

export function roundGeometry(shape: RoundShape, seed: number): RoundGeometry {
  const rand = rng(seed * 29 + 7);
  const lobe = rand() * Math.PI * 2;
  const lean = ((rand() * 2 - 1) * 7 * Math.PI) / 180;
  /** Some fruit grow taller, some squatter. */
  const aspect = 0.9 + rand() * 0.2;
  const e = VIEW[shape];
  const [ce, se] = [Math.cos(e), Math.sin(e)];
  const [cl, sl] = [Math.cos(lean), Math.sin(lean)];
  /** Raw projection, before the drawing is moved into the box. */
  const raw = ([x, y, z]: V3): { at: Pt; z: number } => {
    const y2 = y * ce - z * se;
    const z2 = y * se + z * ce;
    const [sx, sy] = [x, -y2];
    return { at: [sx * cl - sy * sl, sx * sl + sy * cl], z: z2 };
  };
  /** Lifts a point off the skin along roughly its normal, for sepals that curl up. */
  const body = (t: number, phi: number): V3 => {
    const [x, y, z] = surface(shape, lobe, t, phi);
    return shape === "lemon" ? [x * aspect, y, z] : [x, y * aspect, z];
  };
  const point = (t: number, phi: number, lift = 0): V3 => {
    const p = body(t, phi);
    if (!lift) return p;
    const n: V3 = shape === "lemon" ? [p[0] * 0.5, p[1], p[2]] : [p[0], p[1] * 1.6 + 2, p[2]];
    const len = Math.hypot(...n) || 1;
    return [p[0] + (n[0] / len) * lift, p[1] + (n[1] / len) * lift, p[2] + (n[2] / len) * lift];
  };

  const cloud: Pt[] = [];
  for (let i = 0; i <= 40; i++) for (let j = 0; j < 72; j++) cloud.push(raw(body(i / 40, (j / 72) * Math.PI * 2)).at);
  const mx = cloud.reduce((s, p) => s + p[0], 0) / cloud.length;
  const my = cloud.reduce((s, p) => s + p[1], 0) / cloud.length;
  const BINS = 56;
  const far = new Array<number>(BINS).fill(0);
  for (const [x, y] of cloud) {
    const b = Math.floor(((Math.atan2(y - my, x - mx) + Math.PI) / (Math.PI * 2)) * BINS) % BINS;
    far[b] = Math.max(far[b]!, Math.hypot(x - mx, y - my));
  }
  const eased = far.map((r, i) => (far[(i + BINS - 1) % BINS]! + r * 2 + far[(i + 1) % BINS]!) / 4);
  const outline: Pt[] = eased.map((r, i) => {
    const a = ((i + 0.5) / BINS) * Math.PI * 2 - Math.PI;
    return [mx + Math.cos(a) * r, my + Math.sin(a) * r];
  });

  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const [l, r, t, b] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  /** Sit the fruit low in the box, leaving room above for a stem. */
  const [dx, dy] = [50 - (l + r) / 2, 86 - b];
  const move = ([x, y]: Pt): Pt => [x + dx, y + dy];
  const project = (tt: number, phi: number, lift = 0) => {
    const p = raw(point(tt, phi, lift));
    return { at: move(p.at), z: p.z };
  };
  const pts = outline.map(move);
  const crown = project(0, 0);
  const rx = (r - l) / 2;
  const ry = (b - t) / 2;

  const ribs: Pt[][] = [];
  if (shape === "tomato" || shape === "apple") {
    const n = 5;
    for (let i = 0; i < n; i++) {
      /** The valleys of cos(5φ + lobe). */
      const phi = ((2 * i + 1) * Math.PI - lobe) / n;
      const line: Pt[] = [];
      for (let k = 0; k <= 12; k++) {
        const p = project((shape === "tomato" ? 0.07 : 0.16) + k * (shape === "tomato" ? 0.05 : 0.04), phi);
        if (p.z > 3) line.push(p.at);
      }
      if (line.length > 2) ribs.push(line);
    }
  }

  const sepals: Pt[][] = [];
  if (shape === "tomato") {
    const count = 5 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * Math.PI * 2 + rand() * 0.4;
      const reach = 0.2 + rand() * 0.07;
      const curl = (rand() * 2 - 1) * 0.5;
      const side = (sgn: number) =>
        Array.from({ length: 7 }, (_, k) => {
          const u = k / 6;
          const w = 0.2 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.6);
          return project(0.015 + u * reach, phi + curl * u * u + sgn * w, 0.6 + u * u * 3).at;
        });
      sepals.push([...side(1), ...side(-1).reverse()]);
    }
  }

  const meridians: { line: Pt[]; w: number }[] = [];
  if (shape === "apple")
    for (let i = 0; i < 46; i++) {
      const phi = (i / 46) * Math.PI * 2 + rand() * 0.1;
      const [t0, t1] = [0.12 + rand() * 0.12, 0.6 + rand() * 0.35];
      const line: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const p = project(t0 + ((t1 - t0) * k) / 10, phi + Math.sin(k * 0.7 + i) * 0.03);
        if (p.z > 1) line.push(p.at);
      }
      if (line.length > 2) meridians.push({ line, w: rand() });
    }

  const hollow: Pt[] =
    shape === "apple"
      ? Array.from({ length: 16 }, (_, i) => project(0.13, (i / 16) * Math.PI * 2).at)
      : [];

  const up = shape === "lemon" ? [0, 0] : [Math.sin(lean) * 0.4, -Math.cos(lean)];
  const stemLen = shape === "apple" ? 13 : shape === "tomato" ? 5 : 0;
  const bend = (rand() * 2 - 1) * 3;
  const stem: Pt[] = stemLen
    ? [0, 0.5, 1].map((k): Pt => [
        crown.at[0] + up[0]! * stemLen * k + bend * k * k + (shape === "apple" ? 2.5 * k : 0),
        crown.at[1] + up[1]! * stemLen * k,
      ])
    : [];

  const dots: { at: Pt; face: number }[] = [];
  const want = shape === "apple" ? 70 : shape === "tomato" ? 0 : 160;
  for (let tries = 0; dots.length < want && tries < want * 4; tries++) {
    const p = project(0.05 + rand() * 0.9, rand() * Math.PI * 2);
    if (p.z > 4) dots.push({ at: p.at, face: Math.min(1, p.z / 30) });
  }

  return {
    pts,
    cx: (l + r) / 2 + dx,
    cy: (t + b) / 2 + dy,
    rx,
    ry,
    bottom: b + dy,
    crown: crown.at,
    crownFacing: crown.z,
    stem,
    ribs,
    sepals,
    meridians,
    hollow,
    dots,
    project,
  };
}
