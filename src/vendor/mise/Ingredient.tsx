import type { ComponentType } from "react";
import { CATALOG, type IngredientId } from "./catalog";
import type { Cut, Layout } from "./core/cut";
import { Bulb } from "./forms/Bulb";
import { Cap } from "./forms/Cap";
import { Clove } from "./forms/Clove";
import { Curl } from "./forms/Curl";
import { Dust } from "./forms/Dust";
import { Egg } from "./forms/Egg";
import { Floret } from "./forms/Floret";
import { Grain } from "./forms/Grain";
import { Knob } from "./forms/Knob";
import { Leaf } from "./forms/Leaf";
import { Pepper } from "./forms/Pepper";
import { Pool } from "./forms/Pool";
import { Root } from "./forms/Root";
import { Round } from "./forms/Round";
import { Slab } from "./forms/Slab";
import { Stalk } from "./forms/Stalk";
import { Strand } from "./forms/Strand";
import type { FormName, FormProps } from "./sizes";

export const FORMS: { [F in FormName]: ComponentType<FormProps[F]> } = {
  slab: Slab,
  bulb: Bulb,
  clove: Clove,
  knob: Knob,
  stalk: Stalk,
  pool: Pool,
  dust: Dust,
  grain: Grain,
  round: Round,
  root: Root,
  floret: Floret,
  leaf: Leaf,
  egg: Egg,
  curl: Curl,
  strand: Strand,
  pepper: Pepper,
  cap: Cap,
};

/** Any form by name, for callers that pick the form at run time. */
export function Form<F extends FormName>({ form, ...props }: { form: F } & FormProps[F]) {
  const Draw = FORMS[form] as ComponentType<object>;
  return <Draw {...props} />;
}

export interface IngredientProps {
  id: IngredientId;
  cut?: Cut;
  layout?: Layout;
  cooked?: boolean;
  browning?: number;
  /** Overrides the catalog's seed, for drawing several of one ingredient. */
  seed?: number;
  size?: number;
  title?: string;
  className?: string;
}

/** A catalog ingredient, drawn with its form and preset. */
export function Ingredient({ id, ...rest }: IngredientProps) {
  const entry = CATALOG[id];
  const own = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  return <Form form={entry.form} {...(entry.props as object)} {...(own as object)} />;
}
