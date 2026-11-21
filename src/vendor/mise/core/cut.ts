/** One list of cuts for every form. A form that can't do a cut draws the nearest one it can. */
export type Cut = "whole" | "halved" | "sliced" | "diced" | "minced" | "strips" | "wedges" | "rings";
export const CUTS: Cut[] = ["whole", "halved", "sliced", "diced", "minced", "strips", "wedges", "rings"];

/**
 * pile: the whole amount just after cutting, still roughly where it was cut (a token, the board).
 * piece: one representative piece, enlarged to fill the box, for scenes that scatter many.
 */
export type Layout = "pile" | "piece";
