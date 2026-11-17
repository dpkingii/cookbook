import type { Recap } from "@/lib/stats/recap";
import { buttonGhost, listRow } from "@/components/ui/styles";
import { Footer } from "./Footer";
import { NextOrDone } from "./NextOrDone";
import { TechniqueNote } from "@/components/technique/TechniqueNote";
import { ordinal } from "./format";

const SOLID = 5;
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const word = (n: number) => WORDS[n] ?? String(n);

function headline(items: Recap["techniques"]["items"]) {
  const fresh = items.filter((t) => t.first).length;
  const practised = `${word(items.length)} practised`;
  if (fresh === 0) return `${practised}.`;
  if (items.length === 1) return `${practised}, and it was new.`;
  return `${practised}, ${fresh === items.length ? "all" : word(fresh).toLowerCase()} of them new.`;
}

function Meter({ count }: { count: number }) {
  return (
    <div role="img" aria-label={`${Math.min(count, SOLID)} of ${SOLID}`} className="flex shrink-0 gap-1">
      {Array.from({ length: SOLID }, (_, n) => (
        <span key={n} className={`h-1 w-8 ${n < count ? "bg-[var(--ink)]" : "bg-[var(--rule)]"}`} />
      ))}
    </div>
  );
}

export function FinishTechniques({
  techniques,
  last,
  onNext,
  onBack,
}: {
  techniques: Recap["techniques"];
  last: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">Techniques today</p>
        <h1 tabIndex={-1} className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] outline-none">
          {headline(techniques.items)}
        </h1>

        <ul className="mt-6 border-b border-[var(--rule)]">
          {techniques.items.map(({ technique, count, first }) => (
            <li key={technique} className="border-t border-[var(--rule)] py-3">
              <p className={first ? "tag" : "label-caps"}>
                {first ? "First time" : `${ordinal(count)} time`}
              </p>
              <div className="mt-1 flex items-center justify-between gap-4">
                <div className="font-serif text-2xl font-medium leading-tight">
                  <TechniqueNote technique={technique} />
                </div>
                <Meter count={count} />
              </div>
              <p className="mt-1 text-base text-[var(--mute)]">
                {count >= SOLID ? "Solid." : `${SOLID - count} more and this one is solid.`}
              </p>
            </li>
          ))}
        </ul>

        <div className={`${listRow} !border-t-0`}>
          <span className="label-caps">Techniques</span>
          <span className="font-serif text-2xl font-medium tabular-nums">
            {techniques.practised} of {techniques.total}
          </span>
        </div>
      </div>

      <Footer>
        <button type="button" onClick={onBack} className={buttonGhost}>
          Back
        </button>
        <NextOrDone last={last} onNext={onNext} />
      </Footer>
    </>
  );
}
