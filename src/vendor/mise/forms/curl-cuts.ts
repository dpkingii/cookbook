import type { Cut, Layout } from "../core/cut";
import { frameCut } from "../core/frame";
import { bbox, centroid, layFlat, sampleClosed } from "../core/geometry";
import { heapOutline } from "../core/heap";
import { ring, rng, type Pt } from "../core/rough";
import { bodyRun, CURL_COOKED, CURL_RAW, curlParts, mapCurl, spine, tailFan, type CurlPart, type CurlShape } from "./curl-shape";

/** Split lengthwise, butterflied open, cut across into chunks, chopped, or minced into paste. */
export type CurlCut = "split" | "butterflied" | "chunks" | "chopped" | "paste";

export const CURL_CUT: Record<Exclude<Cut, "whole">, CurlCut> = {
  halved: "split",
  strips: "split",
  wedges: "butterflied",
  sliced: "chunks",
  rings: "chunks",
  diced: "chopped",
  minced: "paste",
};

export interface CurlCutResult {
  pieces: CurlPart[];
  heap: boolean;
}

const moveAll = (parts: CurlPart[], rot: number, x: number, y: number, squash = 0.85): CurlPart[] => {
  const [cx, cy] = centroid(parts.find((p) => p.kind === "body")?.outer ?? parts[0]!.outer);
  return parts.map((p) => mapCurl(p, (q) => layFlat([[q[0] - cx, q[1] - cy]], rot, x, y, squash)[0]!));
};

function golden(i: number, n: number, rx: number, ry: number): Pt {
  const r = Math.sqrt((i + 0.5) / n);
  const a = i * 2.39996;
  return [Math.cos(a) * r * rx, Math.sin(a) * r * ry];
}

/** Cuts are of peeled shrimp, tails left on where the whole length survives. */
export function cutCurl(shape: CurlShape, cut: Exclude<Cut, "whole">, seed: number, cooked: boolean): CurlCutResult {
  const rand = rng(seed * 97 + 11);
  const wob = () => rand() * 2 - 1;
  const curl = cooked ? CURL_COOKED : CURL_RAW;
  const R = shape === "prawn" ? 22 : 16;
  const W = R * 0.74;
  switch (CURL_CUT[cut]) {
    case "split": {
      /** Split down the back: two slimmer curls, each showing its cut flesh along the inside. */
      const pieces = [0, 1].flatMap((i) => {
        const s = spine(0, 0, R, W * 0.62, curl, 0.25);
        const body = bodyRun(s, 0, 1, true);
        const parts: CurlPart[] = [
          ...tailFan(s, W * 0.7, seed + i).slice(i, i + 2).map((f): CurlPart => ({ kind: "tail", outer: f, thick: 0.5, group: i })),
          { kind: "body", ...body, faces: [body.outer.slice(0, Math.floor(body.outer.length / 2))], thick: W * 0.18, group: i },
        ];
        return moveAll(parts, (i ? Math.PI + 0.2 : 0.1) + wob() * 0.1, i ? 10 : -10, i ? 6 : -6);
      });
      return { heap: false, pieces };
    }
    case "butterflied": {
      /** Opened along the back and pressed flat: twice as wide, hardly curled, with the groove down the middle. */
      const n = 3;
      const pieces = Array.from({ length: n }, (_, i) => {
        /** A big radius over a short sweep: nearly straight, just bowed. */
        const s = spine(0, 0, R * 5, W * 1.6, -0.8 + curl * 0.1, -1.57);
        const body = bodyRun(s, 0, 1, true);
        const parts: CurlPart[] = [
          ...tailFan(s, W * 0.9, seed + i).map((f): CurlPart => ({ kind: "tail", outer: f, thick: 0.5, group: i })),
          { kind: "body", ...body, faces: [], vein: Array.from({ length: 12 }, (_, j) => s.at(0.04 + (j / 11) * 0.82)), thick: W * 0.2, group: i },
        ];
        return moveAll(parts, 1.4 + wob() * 0.1, (i - 1) * 24, wob() * 3);
      }).flat();
      return { heap: false, pieces };
    }
    case "chunks": {
      /** Each shrimp cut in three: two plump pieces and the tail end with its fan. */
      const pieces: CurlPart[] = [];
      for (let j = 0; j < 3; j++) {
        const s = spine(0, 0, R, W, curl, 0.25);
        [
          [0, 0.36],
          [0.36, 0.68],
          [0.68, 1],
        ].forEach(([a, b], k) => {
          const g = j * 3 + k;
          const body = bodyRun(s, a!, b!, a === 0);
          const parts: CurlPart[] = [{ kind: "body", ...body, thick: W * 0.2, group: g }];
          if (b === 1) parts.unshift(...tailFan(s, W, seed + j).map((f): CurlPart => ({ kind: "tail", outer: f, thick: 0.5, group: g })));
          const [x, y] = golden(g, 9, 30, 20);
          pieces.push(...moveAll(parts, rand() * 6.28, x, y));
        });
      }
      return { heap: false, pieces };
    }
    case "chopped": {
      /** Chopped shrimp: little pieces, white with a streak of red or grey where the outside was. */
      const n = 38;
      return {
        heap: true,
        pieces: Array.from({ length: n }, (_, i): CurlPart => {
          const sz = 3.2 + rand() * 1.4;
          const [x, y] = golden(i, n, 22, 14);
          const r = Math.hypot(x / 22, y / 14);
          const outer = sampleClosed(ring(0, 0, sz, sz * 0.8, seed + i * 3, 0.24, 5), 2);
          const [cx, cy] = centroid(outer);
          const go = (pts: Pt[]) => layFlat(pts.map(([px, py]): Pt => [px - cx, py - cy]), rand() * 6.28, x, y - (1 - r) * 3, 0.8);
          return { kind: "bit", outer: go(outer), thick: sz * 0.5, red: rand() < 0.45, group: i };
        }),
      };
    }
    case "paste": {
      /** Minced into a sticky, smooth paste, mounded where it was scraped together. */
      const { outline } = heapOutline(rand, { cx: 0, cy: 0, rx: 30, ry: 11, height: 14, px: 2 + wob() * 4, bump: 1.6 });
      return { heap: true, pieces: [{ kind: "paste", outer: outline, thick: 0, group: 0 }] };
    }
  }
}

/** The piece a scene would scatter: one shrimp's worth of the cut, or a few chopped bits. */
export function representativeCurl(result: CurlCutResult, cut: Exclude<Cut, "whole">): CurlPart[] {
  const cc = CURL_CUT[cut];
  if (cc === "paste") return result.pieces;
  if (cc === "chopped") {
    const mid = centroid(result.pieces.flatMap((p) => p.outer));
    const near = (p: CurlPart) => Math.hypot(centroid(p.outer)[0] - mid[0], centroid(p.outer)[1] - mid[1]);
    return [...result.pieces].sort((a, b) => near(a) - near(b)).slice(0, 6);
  }
  const bodies = result.pieces.filter((p) => p.kind === "body");
  const size = (p: CurlPart) => bbox(p.outer).w * bbox(p.outer).h;
  const best = bodies.reduce((a, b) => (size(b) > size(a) ? b : a));
  return result.pieces.filter((p) => p.group === best.group);
}

export function frameCurl(shape: CurlShape, cut: Exclude<Cut, "whole">, seed: number, layout: Layout, cooked: boolean) {
  const result = cutCurl(shape, cut, seed, cooked);
  const picked = layout === "piece" ? representativeCurl(result, cut) : result.pieces;
  return { result, ...frameCut(picked, layout === "piece" ? 6 : 1.5) };
}

/** A whole one, as cuts see it, for measuring. */
export const wholeCurl = (shape: CurlShape, seed: number) => curlParts(shape, seed, { curl: CURL_RAW, peeled: false, tail: true, head: true });
