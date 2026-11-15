"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { IngredientToken } from "@/components/stage";
import type { TokenShape } from "@/lib/recipe/types";
import { ingredientsFromLines, moveItem, setIngredientName, setIngredientToken } from "@/lib/recipes/edit";
import { blankIngredient, isBlankIngredient, type FormState, type IngredientForm } from "@/lib/recipes/form";
import { Field } from "./Field";
import { iconButton, inputClass, panel, primaryButton, secondaryButton } from "./ui";

const SHAPES: TokenShape[] = ["round", "bulb", "leaf", "long", "strand", "cube", "liquid", "grain", "wedge"];

function IngredientRow({
  index,
  count,
  ingredient,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  ingredient: IngredientForm;
  error: (field: string) => string | undefined;
  onChange: (next: IngredientForm) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const at = `ingredient-${index}`;
  const label = ingredient.name.trim() || `ingredient ${index + 1}`;
  return (
    <li className="rounded-2xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[5rem_6rem_1fr_1fr]">
        <Field id={`${at}-quantity`} label="Quantity" error={error(`${at}-quantity`)}>
          {(props) => (
            <input
              {...props}
              inputMode="decimal"
              placeholder="1/2"
              className={inputClass}
              value={ingredient.quantity}
              onChange={(event) => onChange({ ...ingredient, quantity: event.target.value })}
            />
          )}
        </Field>
        <Field id={`${at}-unit`} label="Unit">
          {(props) => (
            <input
              {...props}
              placeholder="tbsp"
              className={inputClass}
              value={ingredient.unit}
              onChange={(event) => onChange({ ...ingredient, unit: event.target.value })}
            />
          )}
        </Field>
        <Field id={`${at}-name`} label="Name" error={error(`${at}-name`)} className="col-span-2 sm:col-span-1">
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={ingredient.name}
              onChange={(event) => onChange(setIngredientName(ingredient, event.target.value))}
            />
          )}
        </Field>
        <Field id={`${at}-note`} label="Note" className="col-span-2 sm:col-span-1">
          {(props) => (
            <input
              {...props}
              placeholder="finely chopped"
              className={inputClass}
              value={ingredient.note}
              onChange={(event) => onChange({ ...ingredient, note: event.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <IngredientToken
          ingredient={{ ...ingredient, quantity: null, unit: null }}
          size={44}
        />
        <label className="sr-only" htmlFor={`${at}-shape`}>
          Token shape for {label}
        </label>
        <select
          id={`${at}-shape`}
          className={`${inputClass} !w-auto capitalize`}
          value={ingredient.token.shape}
          onChange={(event) =>
            onChange(setIngredientToken(ingredient, { ...ingredient.token, shape: event.target.value as TokenShape }))
          }
        >
          {SHAPES.map((shape) => (
            <option key={shape} value={shape}>
              {shape}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`${at}-color`}>
          Token colour for {label}
        </label>
        <input
          id={`${at}-color`}
          type="color"
          value={ingredient.token.color}
          onChange={(event) =>
            onChange(setIngredientToken(ingredient, { ...ingredient.token, color: event.target.value }))
          }
          className="size-11 shrink-0 cursor-pointer rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-1"
        />
        <span className="ml-auto flex gap-2">
          <button id={`${at}-up`} type="button" className={iconButton} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>
            <ArrowUp aria-hidden size={20} />
          </button>
          <button id={`${at}-down`} type="button" className={iconButton} disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>
            <ArrowDown aria-hidden size={20} />
          </button>
          <button type="button" className={iconButton} onClick={onRemove} aria-label={`Remove ${label}`}>
            <Trash2 aria-hidden size={20} />
          </button>
        </span>
      </div>
    </li>
  );
}

export function IngredientsSection({
  form,
  setForm,
  focusAfter,
  error,
  removeIngredient,
}: {
  form: FormState;
  setForm: (update: (form: FormState) => FormState) => void;
  focusAfter: (id: string) => void;
  error: (field: string) => string | undefined;
  removeIngredient: (id: string) => void;
}) {
  const [pasted, setPasted] = useState("");
  const rows = form.ingredients;

  const replaceRow = (index: number, next: IngredientForm) =>
    setForm((f) => ({ ...f, ingredients: f.ingredients.map((row, i) => (i === index ? next : row)) }));

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    const keepDirection = dir === -1 ? to > 0 : to < rows.length - 1;
    const button = keepDirection === (dir === -1) ? "up" : "down";
    focusAfter(`ingredient-${to}-${button}`);
    setForm((f) => ({ ...f, ingredients: moveItem(f.ingredients, index, to) }));
  };

  const addPasted = () => {
    const added = ingredientsFromLines(pasted, rows.map((row) => row.id));
    if (!added.length) return;
    setForm((f) => {
      const kept = f.ingredients.length === 1 && isBlankIngredient(f.ingredients[0]) ? [] : f.ingredients;
      return { ...f, ingredients: [...kept, ...added] };
    });
    setPasted("");
  };

  return (
    <section aria-labelledby="ingredients-heading" className={panel}>
      <h2 id="ingredients-heading" className="font-serif text-3xl font-semibold">
        Ingredients
      </h2>
      <p className="mt-1 text-[var(--ink-soft)]">
        Each ingredient gets a token that shows up in the animation. It follows the name until you pick one yourself.
      </p>

      <ul className="mt-4 grid gap-3">
        {rows.map((ingredient, index) => (
          <IngredientRow
            key={ingredient.id}
            index={index}
            count={rows.length}
            ingredient={ingredient}
            error={error}
            onChange={(next) => replaceRow(index, next)}
            onMove={(dir) => move(index, dir)}
            onRemove={() => {
              focusAfter("add-ingredient");
              removeIngredient(ingredient.id);
            }}
          />
        ))}
      </ul>

      <button
        id="add-ingredient"
        type="button"
        className={`${secondaryButton} mt-4`}
        onClick={() => {
          const row = blankIngredient();
          focusAfter(`ingredient-${rows.length}-name`);
          setForm((f) => ({ ...f, ingredients: [...f.ingredients, row] }));
        }}
      >
        <Plus aria-hidden size={20} /> Add ingredient
      </button>

      <details className="mt-4 rounded-2xl border-2 border-dashed border-[var(--ink)] p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">Paste ingredient lines</summary>
        <label htmlFor="paste-lines" className="mt-2 block text-base font-semibold">
          One ingredient per line
        </label>
        <textarea
          id="paste-lines"
          rows={5}
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          placeholder={"2 tbsp soy sauce\n1 clove garlic, minced\n200 g rice noodles"}
          className={`${inputClass} mt-1`}
        />
        <button type="button" className={`${primaryButton} mt-3`} onClick={addPasted} disabled={!pasted.trim()}>
          Add these ingredients
        </button>
      </details>
    </section>
  );
}
