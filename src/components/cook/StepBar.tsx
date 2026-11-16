import type { Recipe } from "@/lib/recipe/types";
import { hasUnfinishedStayTimer, remainingMs, timerForStep, type PlayerState } from "@/lib/player";
import { buttonGhost, buttonPrimary } from "@/components/ui/styles";
import { Footer } from "./Footer";
import { formatClock } from "./format";

export function StepBar({
  recipe,
  state,
  now,
  onNext,
  onBack,
  dock,
}: {
  recipe: Recipe;
  state: PlayerState;
  now: number;
  onNext: () => void;
  onBack: () => void;
  dock: React.ReactNode;
}) {
  const i = state.currentStep;
  const timer = timerForStep(state, i);
  const waiting = hasUnfinishedStayTimer(state);
  const last = i === recipe.steps.length - 1;

  return (
    <Footer dock={dock}>
      {timer?.status === "running" && (
        <span
          role="timer"
          aria-label={`${timer.label} time left`}
          className="mr-auto font-serif text-3xl font-medium tabular-nums"
        >
          {formatClock(remainingMs(timer, now))}
        </span>
      )}
      <button
        type="button"
        onClick={onBack}
        disabled={i === 0 || state.paused}
        className={`${buttonGhost} ml-auto`}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={state.paused}
        className={
          waiting
            ? `${buttonGhost} max-[400px]:px-3`
            : `${buttonPrimary} min-w-28`
        }
      >
        {waiting ? "Skip ahead anyway" : last ? "Done cooking" : "Next"}
      </button>
    </Footer>
  );
}
