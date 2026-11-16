"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import type { Recipe } from "@/lib/recipe/types";
import { summary, type PlayerState } from "@/lib/player";
import { FinishLogged } from "./FinishLogged";
import { FinishNext } from "./FinishNext";
import { FinishRating } from "./FinishRating";
import { FinishTechniques } from "./FinishTechniques";
import { FinishWeek } from "./FinishWeek";
import { useRecap } from "./useRecap";

type Screen = "rate" | "logged" | "week" | "techniques" | "next";

export function FinishScreen({
  recipe,
  state,
  flush,
  sessionId,
  onFinish,
  onBackToSteps,
  onRestart,
}: {
  recipe: Recipe;
  state: PlayerState;
  flush: () => Promise<boolean>;
  sessionId: () => string;
  onFinish: (result: { rating?: number; note?: string }) => void;
  onBackToSteps: () => void;
  onRestart: () => void;
}) {
  const finished = state.phase === "finished";
  const [screen, setScreen] = useState<Screen>(finished ? "logged" : "rate");
  const recap = useRecap({ enabled: finished, flush, sessionId });
  const { data: auth, isPending } = authClient.useSession();
  const guest = !isPending && (!auth || auth.user.isAnonymous === true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [screen]);

  const local = summary(state, recipe);
  const ready = recap.status === "ready" ? recap.recap : null;
  const counted = ready?.session.plausible ?? local.plausible;

  const path: Screen[] = ["logged"];
  if (counted && ready) path.push("week");
  if (counted && ready && ready.techniques.items.length > 0) path.push("techniques");
  path.push("next");
  const step = (by: number) => setScreen(path[Math.max(0, path.indexOf(screen) + by)]);

  const save = (result: { rating?: number; note?: string }) => {
    onFinish(result);
    setScreen("logged");
  };

  return (
    <div ref={root} className="flex flex-1 flex-col">
      {screen === "rate" && <FinishRating onSave={save} onSkip={() => save({})} onBack={onBackToSteps} />}
      {screen === "logged" && (
        <FinishLogged
          local={{ title: recipe.title, seconds: local.durationSeconds, plausible: local.plausible, techniques: local.techniques }}
          recap={recap}
          onNext={() => step(1)}
        />
      )}
      {screen === "week" && ready && <FinishWeek streak={ready.streak} onNext={() => step(1)} onBack={() => step(-1)} />}
      {screen === "techniques" && ready && (
        <FinishTechniques techniques={ready.techniques} onNext={() => step(1)} onBack={() => step(-1)} />
      )}
      {screen === "next" && (
        <FinishNext next={ready?.next ?? null} guest={guest} onBack={() => step(-1)} onRestart={onRestart} />
      )}
    </div>
  );
}
