import Link from "next/link";
import type { Recap } from "@/lib/stats/recap";
import { buttonGhost, buttonPrimary, textLink } from "@/components/ui/styles";
import { Footer } from "./Footer";
import { formatMinutes } from "./format";

const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0]);

export function FinishNext({
  next,
  guest,
  onBack,
  onRestart,
}: {
  next: Recap["next"];
  guest: boolean;
  onBack: () => void;
  onRestart: () => void;
}) {
  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">Next</p>
        <h1 tabIndex={-1} className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] outline-none">
          {next ? "Ready for something new?" : "Nothing new to suggest right now."}
        </h1>

        {next ? (
          <div className="sheet mt-6 p-4">
            <p className="tag">Teaches {list(next.teaches)}</p>
            <p className="mt-1 font-serif text-2xl font-medium leading-tight">{next.title}</p>
            <p className="mt-2 text-base text-[var(--mute)]">
              {next.cuisine} · <span className="capitalize">{next.difficulty}</span> · {formatMinutes(next.minutes)} ·{" "}
              {next.steps} steps
            </p>
          </div>
        ) : (
          <p className="mt-3 text-base text-[var(--mute)]">Pick any recipe and keep practising.</p>
        )}

        <ul className="mt-6 grid gap-1 text-base">
          <li>
            <button type="button" onClick={onRestart} className={`${textLink} inline-flex min-h-11 items-center`}>
              Cook it again
            </button>
          </li>
          <li>
            <Link href="/history" className={`${textLink} inline-flex min-h-11 items-center`}>
              See your history
            </Link>
          </li>
          {next && (
            <li>
              <Link href="/" className={`${textLink} inline-flex min-h-11 items-center`}>
                Back to recipes
              </Link>
            </li>
          )}
        </ul>

        {guest && (
          <p className="mt-4 border-t border-[var(--rule)] pt-3 text-base text-[var(--mute)]">
            You are cooking as a guest.{" "}
            <Link href="/signup" className={`${textLink} text-[var(--ink)]`}>
              Sign up
            </Link>{" "}
            to keep your history and skills.
          </p>
        )}
      </div>

      <Footer>
        <button type="button" onClick={onBack} className={buttonGhost}>
          Back
        </button>
        <Link href={next ? `/recipes/${next.id}` : "/"} className={`${buttonPrimary} flex-1`}>
          {next ? "See the recipe" : "Back to recipes"}
        </Link>
      </Footer>
    </>
  );
}
