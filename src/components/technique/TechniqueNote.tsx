"use client";

import { useId, useRef } from "react";
import { TECHNIQUE_NOTES } from "@/lib/recipe/technique-notes";
import type { Technique } from "@/lib/recipe/types";
import { buttonPrimary } from "@/components/ui/styles";

/**
 * The technique's name as a button. Tapping it opens a short explanation:
 * what it is, why, what right looks like, and the usual fix.
 */
export function TechniqueNote({ technique, className = "" }: { technique: Technique; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const note = TECHNIQUE_NOTES[technique];

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className={`underline decoration-dotted underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)] ${className}`}
      >
        {note.name}
        <span className="sr-only">: what does this mean?</span>
      </button>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="m-0 mt-auto w-full max-w-none border-0 border-t-2 border-[var(--ink)] bg-white p-0 text-[var(--ink)] backdrop:bg-black/40 sm:m-auto sm:max-w-md sm:border-2 sm:shadow-[6px_6px_0_var(--ink)]"
      >
        <div className="mx-auto max-w-xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-left normal-case tracking-normal">
          <p className="label-caps">Technique</p>
          <h2 id={titleId} className="mt-1 font-serif text-3xl font-medium tracking-[-0.02em]">
            {note.name}
          </h2>
          <p className="mt-3 text-lg leading-snug">{note.what}</p>

          <dl className="mt-4">
            <div className="border-t border-[var(--rule)] py-3">
              <dt className="label-caps">Why</dt>
              <dd className="mt-1 text-base leading-snug">{note.why}</dd>
            </div>
            <div className="border-t border-[var(--rule)] py-3">
              <dt className="label-caps">Going right</dt>
              <dd className="mt-1 text-base leading-snug">{note.right}</dd>
            </div>
            <div className="border-t border-[var(--rule)] py-3">
              <dt className="label-caps">If something is off</dt>
              <dd className="mt-1 text-base leading-snug">
                <span className="font-medium">{note.fix.when}?</span>{" "}
                {note.fix.then.charAt(0).toUpperCase() + note.fix.then.slice(1)}
              </dd>
            </div>
          </dl>

          <form method="dialog" className="mt-2">
            <button type="submit" className={`${buttonPrimary} w-full`}>
              Got it
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
