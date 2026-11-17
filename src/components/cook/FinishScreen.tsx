"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import type { Recipe } from "@/lib/recipe/types";
import { summary, type PlayerState } from "@/lib/player";
import { uploadPhoto } from "@/lib/photos/client";
import { FinishLogged } from "./FinishLogged";
import { FinishNext } from "./FinishNext";
import { FinishPhoto } from "./FinishPhoto";
import { FinishRating } from "./FinishRating";
import { FinishTechniques } from "./FinishTechniques";
import { FinishWeek } from "./FinishWeek";
import { useRecap } from "./useRecap";

type Screen = "photo" | "rate" | "logged" | "week" | "techniques" | "next";

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
  const [screen, setScreen] = useState<Screen>(finished ? "logged" : "photo");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"saving" | "saved" | "failed">("saving");
  const recap = useRecap({ enabled: finished, flush, sessionId });
  const { data: auth, isPending } = authClient.useSession();
  const guest = !isPending && (!auth || auth.user.isAnonymous === true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  }, [screen]);

  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo]);

  /** The session has to exist on the server before a photo can be attached to it. */
  const sendPhoto = useCallback(
    async (blob: Blob) => {
      setPhotoStatus("saving");
      const saved = (await flush()) && (await uploadPhoto(sessionId(), blob)) !== null;
      setPhotoStatus(saved ? "saved" : "failed");
    },
    [flush, sessionId],
  );

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
    if (photo) void sendPhoto(photo.blob);
    setScreen("logged");
  };

  return (
    <div ref={root} className="flex flex-1 flex-col">
      {screen === "photo" && (
        <FinishPhoto
          title={recipe.title}
          preview={photo?.url ?? null}
          onPhoto={(blob) => setPhoto({ blob, url: URL.createObjectURL(blob) })}
          onNext={() => setScreen("rate")}
          onBack={onBackToSteps}
        />
      )}
      {screen === "rate" && <FinishRating onSave={save} onSkip={() => save({})} onBack={() => setScreen("photo")} />}
      {screen === "logged" && (
        <FinishLogged
          local={{ title: recipe.title, seconds: local.durationSeconds, plausible: local.plausible, techniques: local.techniques }}
          recap={recap}
          photo={photo && { url: photo.url, status: photoStatus, onRetry: () => void sendPhoto(photo.blob) }}
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
