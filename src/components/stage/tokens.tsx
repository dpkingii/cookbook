import type { Ingredient, TokenShape } from "@/lib/recipe/types";
import { HEX, INK, mix } from "./palette";

interface ArtProps {
  shape: TokenShape;
  color: string;
  /** Key-line width in the token's own 48-unit box. */
  stroke?: number;
}

const OFF = "translate(1.2 0.9)";

function Two({ d, fill, stroke }: { d: string; fill: string; stroke: number }) {
  return (
    <>
      <path d={d} fill={fill} transform={OFF} />
      <path d={d} fill="none" stroke={INK.ink} strokeWidth={stroke} strokeLinejoin="round" />
    </>
  );
}

function Lines({ d, stroke, color = INK.ink }: { d: string; stroke: number; color?: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** One ingredient drawn in a 48×48 box centred on (24, 24). Shared by the stage and the token. */
export function TokenArt({ shape, color, stroke = 2.4 }: ArtProps) {
  const thin = stroke * 0.6;
  switch (shape) {
    case "round":
      return (
        <g>
          <Two d="M24 11C35 11 41 18 40 28C39 37 32 42 24 42C15 42 8 37 8 27C8 18 14 11 24 11Z" fill={color} stroke={stroke} />
          <Lines d="M14 25Q15 18 21 16" stroke={stroke * 0.9} color={INK.paper} />
          <path d="M24 13L19 8L23.5 10.5L24 5L25.5 10.5L30 8L25.5 13Z" fill={INK.ink} />
        </g>
      );
    case "bulb":
      return (
        <g>
          <Two d="M24 5C27 12 40 17 40 29C40 38 33 43 24 43C15 43 8 38 8 29C8 17 21 12 24 5Z" fill={color} stroke={stroke} />
          <Lines d="M24 9C19 18 16 26 17.5 41M24 9C29 18 32 26 30.5 41" stroke={thin} />
          <Lines d="M21 43.5L19 46.5M24 43.5V47M27 43.5L29 46.5" stroke={thin} />
        </g>
      );
    case "leaf":
      return (
        <g>
          <Two d="M9 40C6 25 18 9 40 8C41 28 29 42 9 40Z" fill={color} stroke={stroke} />
          <Lines d="M7 42Q22 28 36 12M17 30L16 23M17 30L24 31M25 22L25 16M25 22L31 22" stroke={thin} />
        </g>
      );
    case "long":
      return (
        <g>
          <Two d="M7 42C11 31 27 14 36 8C40 6 43 9 41 13C35 22 19 36 7 42Z" fill={color} stroke={stroke} />
          <Lines d="M17 30L21 33M24 22L28 25M31 15L34 18" stroke={thin} />
        </g>
      );
    case "strand":
      return (
        <g>
          {[0, 4, 8, 12, 16].map((o) => (
            <g key={o}>
              <Lines d={`M${6 + o} 42L${20 + o} 6`} stroke={stroke * 2.1} />
              <Lines d={`M${6 + o} 42L${20 + o} 6`} stroke={stroke * 1.05} color={color} />
            </g>
          ))}
          <path d="M11 22L33 30L31 35L9 27Z" fill={INK.tomato} stroke={INK.ink} strokeWidth={thin} strokeLinejoin="round" />
        </g>
      );
    case "cube":
      return (
        <g>
          <path d="M24 8L40 16L24 24L8 16Z" fill={mix(color, HEX.paper, 0.45)} transform={OFF} />
          <path d="M8 16L24 24L24 42L8 34Z" fill={color} transform={OFF} />
          <path d="M24 24L40 16L40 34L24 42Z" fill={mix(color, HEX.ink, 0.2)} transform={OFF} />
          <Lines d="M24 8L40 16L40 34L24 42L8 34L8 16ZM8 16L24 24L40 16M24 24V42" stroke={stroke} />
          <circle cx={31} cy={29} r={1.6} fill={INK.ink} />
          <circle cx={15} cy={26} r={1.2} fill={INK.ink} />
        </g>
      );
    case "liquid":
      return (
        <g>
          <Two d="M24 5C30 15 38 22 38 30C38 38 32 43 24 43C16 43 10 38 10 30C10 22 18 15 24 5Z" fill={color} stroke={stroke} />
          <Lines d="M16 30Q16 24 20 20" stroke={stroke * 0.9} color={INK.paper} />
        </g>
      );
    case "grain":
      return (
        <g>
          <Two d="M6 40C11 30 17 24 24 24C31 24 37 30 42 40Z" fill={color} stroke={stroke} />
          {[
            [18, 18, 20],
            [26, 14, -15],
            [31, 20, 40],
            [22, 9, 10],
          ].map(([x, y, rot]) => (
            <rect
              key={`${x}-${y}`}
              x={x - 2.5}
              y={y - 2.5}
              width={5}
              height={5}
              rx={1}
              fill={color}
              stroke={INK.ink}
              strokeWidth={thin}
              transform={`rotate(${rot} ${x} ${y})`}
            />
          ))}
        </g>
      );
    case "wedge":
      return (
        <g>
          <Two d="M12 41C6 29 13 13 27 6C27 14 34 20 37 30C39 37 35 41 30 41Z" fill={color} stroke={stroke} />
          <Lines d="M26 9C21 19 19 31 22 41" stroke={thin} />
          <Lines d="M27 6L29 2.5" stroke={stroke} />
        </g>
      );
  }
}

export function IngredientToken({ ingredient, size }: { ingredient: Ingredient; size: number }) {
  return (
    <svg
      viewBox="-2 -2 52 52"
      width={size}
      height={size}
      role="img"
      aria-label={ingredient.name}
      style={{ display: "inline-block", flexShrink: 0, overflow: "visible" }}
    >
      <TokenArt shape={ingredient.token.shape} color={ingredient.token.color} />
    </svg>
  );
}
