import { useId, type ReactNode } from "react";

/** Every form draws in a 100×100 box. */
export const BOX = 100;
/** The thin dark edge round every piece, in box units, so pieces stay separate in a crowded pan. */
export const EDGE = 1.6;

export interface ArtProps {
  /** Rendered width and height in px. */
  size?: number;
  /**
   * What the drawing shows, read out by screen readers: "Diced red onion", "Lemon, grilled". Leave it out only when the
   * same words sit right next to the drawing, which then stays hidden from assistive technology as decoration.
   */
  title?: string;
  className?: string;
  /**
   * The food's real size in centimetres, when it differs from the usual for its shape: 2.5 for a cherry tomato drawn
   * with `shape="tomato"`, 12 for a beefsteak. It is the width as drawn for whole food, how wide a pour or heap spreads
   * for Pool and Dust, and one grain's length for Grain. It never changes the drawing, only what `boxCm` reports.
   */
  realSize?: number;
}

/**
 * The SVG every form draws into. Named, it is one image to assistive technology (its parts are never read out one by
 * one); unnamed, it is hidden. It never takes focus and never moves, so it adds nothing to a keyboard or switch path and
 * nothing for a vestibular disorder to react to.
 */
export function Art({ size = 96, title, className, children }: ArtProps & { children: ReactNode }) {
  const id = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-title`;
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-labelledby={title ? id : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      overflow="visible"
    >
      {title && <title id={id}>{title}</title>}
      {children}
    </svg>
  );
}
