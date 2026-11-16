import { HEX, LINE } from "./palette";
import s from "./stage.module.css";

const WISP = "M0 0C-6-6 6-12 0-18C-6-24 6-30 0-36";

/** Wisps rising from a line. `amount` 0–1 sets how many, how big and how fast. */
export function Steam({
  x,
  y,
  width,
  amount,
  size = 1,
}: {
  x: number;
  y: number;
  width: number;
  amount: number;
  size?: number;
}) {
  const n = Math.round(amount * 7);
  if (n === 0) return null;
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const wx = Math.round(x - width / 2 + t * width);
        const k = size * (0.75 + ((i * 37) % 10) / 20) * (0.7 + amount * 0.5);
        return (
          <g key={i} transform={`translate(${wx} ${y - (i % 2) * 10}) scale(${k})`}>
            <path
              className={s.rise}
              d={WISP}
              fill="none"
              stroke={HEX.grey}
              strokeWidth={2.2}
              strokeLinecap="round"
              opacity={0.8}
              style={{
                animationDuration: `${3.6 - amount * 1.6}s`,
                animationDelay: `${-i * 0.71}s`,
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Bubbles swelling and popping on a liquid surface, drawn as rings. */
export function Bubbles({
  cx,
  cy,
  rx,
  ry,
  n,
  r,
  period,
  seed = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  n: number;
  r: number;
  period: number;
  seed?: number;
}) {
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i * 2.399 + seed) % (Math.PI * 2);
        const rad = Math.sqrt(((i * 0.618 + seed * 0.1) % 1) * 0.8 + 0.1);
        const x = cx + Math.cos(a) * rx * rad;
        const y = cy + Math.sin(a) * ry * rad;
        const br = Math.round(r * 1.45 * (0.65 + ((i * 53) % 10) / 14) * 10) / 10;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g
              className={s.bubble}
              style={{ animationDuration: `${period * (0.8 + (i % 3) * 0.2)}s`, animationDelay: `${(-i * period) / n}s` }}
            >
              <ellipse rx={br} ry={br * 0.8} fill="none" stroke={HEX.ink} strokeWidth={LINE.detail} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Little comic sizzle ticks around the rim of the food. */
export function Sizzle({
  cx,
  cy,
  rx,
  ry,
  amount,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  amount: number;
}) {
  const n = Math.round(amount * 8);
  return (
    <g aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI + (Math.PI * (i + 0.5)) / n + (i % 2 ? 0.15 : -0.1);
        const px = Math.round(cx + Math.cos(a) * rx);
        const py = Math.round(cy + Math.sin(a) * ry);
        const deg = Math.round((a * 180) / Math.PI + 90);
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${deg})`}>
            <path
              className={s.sizzle}
              d="M-5 -2L-7 -9M0 -3V-11M5 -2L7 -9"
              stroke={HEX.ink}
              strokeWidth={2}
              strokeLinecap="round"
              style={{ animationDelay: `${-i * 0.23}s`, animationDuration: `${0.9 - amount * 0.35}s` }}
            />
          </g>
        );
      })}
    </g>
  );
}
