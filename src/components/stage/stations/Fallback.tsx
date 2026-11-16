import type { Heat } from "@/lib/recipe/types";
import type { Scene } from "../contents";
import { HEX, LINE } from "../palette";
import { blob } from "../rough";
import s from "../stage.module.css";
import { TokenArt } from "../tokens";

const FLAMES: Record<Heat, number> = { low: 1, medium: 2, high: 3 };
const FLAME = "M0 0C-7 0-9-8-5-14C-3-18-1-21 0-27C3-20 9-15 8-7C7-2 4 0 0 0Z";

/** For stations not drawn yet: a card with the technique, its ingredients and the heat. */
export function Fallback({ scene }: { scene: Scene }) {
  const tokens = (scene.uses.length ? scene.uses : scene.items.map((i) => i.ingredient)).slice(0, 5);
  const card = blob(200, 150, 150, 98, 4242, 0.025, 12);
  const word = scene.technique.toUpperCase();
  const fontSize = Math.round(Math.min(58, 250 / (word.length * 0.72)));
  const span = tokens.length * 70;
  return (
    <g>
      <path d={card} fill={HEX.white} stroke={HEX.ink} strokeWidth={LINE.main} />
      <text
        x={200}
        y={84}
        textAnchor="middle"
        fontSize={13}
        letterSpacing={4}
        fill={HEX.grey}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: 600 }}
      >
        {scene.vessel.toUpperCase()}
      </text>
      <text
        x={200}
        y={140}
        textAnchor="middle"
        fontSize={fontSize}
        fill={HEX.ink}
        style={{ fontFamily: "var(--font-newsreader), Georgia, serif", fontWeight: 500 }}
      >
        {word}
      </text>
      {tokens.map((ing, i) => (
        <g key={ing.id} transform={`translate(${200 - span / 2 + 35 + i * 70} 190) scale(1.3)`}>
          <g className={s.bob} style={{ animationDelay: `${-i * 0.4}s` }}>
            <g transform="translate(-24 -24)">
              <TokenArt shape={ing.token.shape} color={ing.token.color} />
            </g>
          </g>
        </g>
      ))}
      {scene.heat &&
        Array.from({ length: FLAMES[scene.heat] }, (_, i) => (
          <g key={i} transform={`translate(${200 + (i - (FLAMES[scene.heat!] - 1) / 2) * 16} 256) scale(0.7)`}>
            <g className={s.flicker} style={{ animationDelay: `${-i * 0.15}s` }}>
              <path d={FLAME} fill={HEX.ink} />
            </g>
          </g>
        ))}
    </g>
  );
}
