import type { ArtProps } from "../core/Art";
import type { Cut, Layout } from "../core/cut";
import { rng, type Pt } from "../core/rough";

/**
 * Button (and cremini): a round domed cap on a short thick stem. Shiitake: a broad, flatter brown cap, cracked pale on
 * top, its rim curled under, on a thin fibrous stem. Oyster: soft grey fans in a cluster, gills running to a stub.
 */
export type CapShape = "button" | "shiitake" | "oyster";

export interface CapProps extends ArtProps {
  /** The top of the cap. */
  color: string;
  /** The stem and the flesh inside. */
  flesh?: string;
  shape?: CapShape;
  /**
   * Halved and sliced show the mushroom's cross-section (sliced in several thin slices); wedges quarter it; strips cut
   * it thin (oyster mushrooms tear into strips); diced and minced chop it.
   */
  cut?: Cut;
  layout?: Layout;
  /** Cooked: mushrooms shrink, darken and turn glossy; `browning` sears the cut faces. */
  cooked?: boolean;
  cookedColor?: string;
  browning?: number;
  seed?: number;
}

export const FLESH: Record<CapShape, string> = { button: "#f4eee2", shiitake: "#efe6d2", oyster: "#efe9df" };
export const GILL: Record<CapShape, string> = { button: "#b59a82", shiitake: "#e8dcc2", oyster: "#e2d8c6" };

/** Proportions of the side-on silhouette, relative to the cap's width. */
const PROPS: Record<Exclude<CapShape, "oyster">, { capH: number; dome: number; stemW: number; stemH: number; rim: number }> = {
  button: { capH: 0.55, dome: 0.75, stemW: 0.36, stemH: 0.42, rim: 0.1 },
  shiitake: { capH: 0.32, dome: 0.55, stemW: 0.22, stemH: 0.5, rim: 0.12 },
};

export interface Silhouette {
  outline: Pt[];
  /** The top of the cap, where its skin shows on a cut face. */
  top: Pt[];
  /** The gills, a thin dark band under the cap. */
  gills: Pt[];
  /** The underside line of the cap, where it meets the stem. */
  under: Pt[];
}

/** A mushroom cut through its middle, centred at the top of the stem: the cap's dome over a stem. */
export function silhouette(shape: Exclude<CapShape, "oyster">, W: number, seed: number): Silhouette {
  const rand = rng(seed * 23 + 1);
  const p = PROPS[shape];
  const lean = (rand() - 0.5) * 0.12;
  const N = 24;
  const top = Array.from({ length: N + 1 }, (_, i): Pt => {
    const a = Math.PI - (i / N) * Math.PI;
    return [Math.cos(a) * (W / 2) * (1 + (rand() - 0.5) * 0.02), -(Math.sin(a) ** p.dome) * W * p.capH];
  });
  const rimY = W * p.rim;
  const sw = W * p.stemW;
  const sh = W * p.stemH;
  const right: Pt[] = [
    [W / 2 + W * 0.01, rimY * 0.4],
    [W * 0.46, rimY],
    [sw * 0.9, rimY * 0.7],
    [sw / 2, rimY * 0.9],
    [(sw / 2) * 1.06 + lean * sh, rimY + sh * 0.6],
    [(sw / 2) * 1.12 + lean * sh, rimY + sh * 0.95],
    [lean * sh, rimY + sh * 1.05],
  ];
  const left = right.slice(0, -1).reverse().map(([x, y]): Pt => [-x + 2 * lean * Math.max(0, y - rimY), y]);
  const outline = [...top, ...right, ...left];
  const under: Pt[] = [
    [-W * 0.46, rimY],
    [-sw / 2, rimY * 0.9],
    [sw / 2, rimY * 0.9],
    [W * 0.46, rimY],
  ];
  const gills: Pt[] = [
    [-W * 0.47, rimY * 0.95],
    [-sw / 2, rimY * 0.75],
    [sw / 2, rimY * 0.75],
    [W * 0.47, rimY * 0.95],
    [W * 0.42, rimY * 0.35],
    [sw / 2, rimY * 0.05],
    [-sw / 2, rimY * 0.05],
    [-W * 0.42, rimY * 0.35],
  ];
  return { outline, top, gills, under };
}

/** An oyster mushroom's fan, from its stub at (0, 0) spreading toward `angle`, with gills radiating from the stub. */
export function fan(len: number, spread: number, angle: number, seed: number): { outline: Pt[]; gills: Pt[][] } {
  const rand = rng(seed * 19 + 7);
  const N = 30;
  const edge = Array.from({ length: N + 1 }, (_, i): Pt => {
    const a = angle - spread / 2 + (i / N) * spread;
    /** A soft, gently wavy edge, not a ruffle. */
    const r = len * (0.8 + 0.2 * Math.sin((i / N) * Math.PI)) * (1 + Math.sin(i * 0.55 + seed) * 0.05 + (rand() - 0.5) * 0.015);
    return [Math.cos(a) * r, Math.sin(a) * r * 0.8];
  });
  const stub: Pt[] = [
    [Math.cos(angle + Math.PI / 2) * len * 0.08, Math.sin(angle + Math.PI / 2) * len * 0.06],
    [-Math.cos(angle) * len * 0.1, -Math.sin(angle) * len * 0.08],
    [Math.cos(angle - Math.PI / 2) * len * 0.08, Math.sin(angle - Math.PI / 2) * len * 0.06],
  ];
  const gills = Array.from({ length: 7 }, (_, i): Pt[] => {
    const a = angle - spread / 2 + ((i + 0.5) / 7) * spread;
    return [
      [Math.cos(a) * len * 0.12, Math.sin(a) * len * 0.1],
      [Math.cos(a) * len * 0.82, Math.sin(a) * len * 0.66],
    ];
  });
  return { outline: [...edge, ...stub.reverse().slice(1, 2)], gills };
}

export interface CapWhole {
  /** Back to front: each a cap (domed top, rim ellipse and gills seen under it) on its stem, or an oyster fan. */
  caps: { cap: Pt[]; rim: Pt[]; gills: Pt[]; stem: Pt[]; cracks: Pt[][] }[];
  fans: { outline: Pt[]; gills: Pt[][] }[];
}

/** A whole mushroom fitted to the box, seen from a little above: the domed cap, a glimpse of gills under its rim, the stem. */
export function capGeometry(shape: CapShape, seed: number): CapWhole {
  const rand = rng(seed * 41 + 3);
  if (shape === "oyster") {
    /** A cluster of fans growing from one base. */
    /** Overlapping caps seen from above, the back ones larger. */
    const fans = [-2.0, -1.15, -0.4, -1.6, -0.8].map((a, i) => fan(i < 3 ? 42 : 32, 1.9, a + (rand() - 0.5) * 0.2, seed * 10 + i));
    const base: Pt = [44, 80];
    return { caps: [], fans: fans.map((f) => ({ outline: f.outline.map(([x, y]): Pt => [base[0] + x, base[1] + y]), gills: f.gills.map((g) => g.map(([x, y]): Pt => [base[0] + x, base[1] + y])) })) };
  }
  const p = PROPS[shape];
  const W = shape === "button" ? 66 : 80;
  const cx = 50;
  const rimY = shape === "button" ? 58 : 50;
  const ry = W * 0.16;
  const capTop = Array.from({ length: 25 }, (_, i): Pt => {
    const a = Math.PI - (i / 24) * Math.PI;
    return [cx + Math.cos(a) * (W / 2), rimY - Math.sin(a) ** p.dome * W * p.capH * 0.95];
  });
  /** The rim's near edge, curving toward the viewer, closes the cap below. */
  const rimFront = Array.from({ length: 13 }, (_, i): Pt => {
    const a = (i / 12) * Math.PI;
    return [cx + Math.cos(a) * (W / 2), rimY + Math.sin(a) * ry * 0.55];
  });
  const cap = [...capTop, ...rimFront];
  const gills = Array.from({ length: 13 }, (_, i): Pt => {
    const a = (i / 12) * Math.PI;
    return [cx + Math.cos(a) * (W / 2) * 0.94, rimY + Math.sin(a) * ry];
  });
  const sw = W * p.stemW;
  const sh = W * p.stemH;
  const stem: Pt[] = [
    [cx - sw / 2, rimY + ry * 0.4],
    [cx - sw * 0.56, rimY + ry * 0.4 + sh * 0.9],
    [cx - sw * 0.35, rimY + ry * 0.4 + sh * 1.05],
    [cx + sw * 0.35, rimY + ry * 0.4 + sh * 1.05],
    [cx + sw * 0.56, rimY + ry * 0.4 + sh * 0.9],
    [cx + sw / 2, rimY + ry * 0.4],
  ];
  /** A shiitake's cap cracks into a pale web as it dries. */
  const cracks: Pt[][] =
    shape === "shiitake"
      ? Array.from({ length: 9 }, () => {
          const [x, y] = [cx + (rand() - 0.5) * W * 0.6, rimY - W * p.capH * (0.2 + rand() * 0.55)];
          const a = rand() * Math.PI;
          const L = 4 + rand() * 6;
          return [
            [x - Math.cos(a) * L, y - Math.sin(a) * L * 0.4],
            [x + (rand() - 0.5) * 2, y + (rand() - 0.5) * 1.5],
            [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.4],
          ];
        })
      : [];
  return { caps: [{ cap, rim: rimFront, gills, stem, cracks }], fans: [] };
}
