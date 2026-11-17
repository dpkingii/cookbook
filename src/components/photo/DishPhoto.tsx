"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { photoUrl, uploadPhoto } from "@/lib/photos/client";
import { buttonGhost, textLink } from "@/components/ui/styles";
import { EmptyPlate } from "./EmptyPlate";
import { PhotoButton } from "./PhotoButton";

type Problem = "unreadable" | "unsaved" | null;

const PROBLEMS = {
  unreadable: "That file could not be read as a photo. Try another one.",
  unsaved: "The photo could not be saved. Check your connection and try again.",
};

/** The photo of one cook on its history page, with a way to add, replace or remove it. */
export function DishPhoto({ sessionId, version, title }: { sessionId: string; version: number | null; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  const save = async (photo: Blob) => {
    setBusy(true);
    const saved = await uploadPhoto(sessionId, photo);
    setBusy(false);
    setProblem(saved === null ? "unsaved" : null);
    if (saved !== null) router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    const response = await fetch(`/api/sessions/${sessionId}/photo`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setProblem(response?.ok ? null : "unsaved");
    if (response?.ok) router.refresh();
  };

  return (
    <div className="mt-6">
      {version === null ? (
        <div className="sheet flex items-center gap-4 p-4">
          <EmptyPlate className="w-24 shrink-0" />
          <div>
            <p className="text-base">No photo of this one yet.</p>
            <PhotoButton className={`${buttonGhost} mt-3`} onPhoto={save} onError={() => setProblem("unreadable")}>
              {busy ? "Saving…" : "Add a photo"}
            </PhotoButton>
          </div>
        </div>
      ) : (
        <>
          <div className="sheet max-w-lg p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- private photo served by our own route */}
            <img src={photoUrl(sessionId, version)} alt={`Your ${title}`} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <PhotoButton className={textLink} onPhoto={save} onError={() => setProblem("unreadable")}>
              {busy ? "Saving…" : "Replace photo"}
            </PhotoButton>
            <button type="button" disabled={busy} onClick={remove} className={textLink}>
              Remove
            </button>
          </div>
        </>
      )}
      {problem && (
        <p role="alert" className="mt-3 text-base text-[var(--danger)]">
          {PROBLEMS[problem]}
        </p>
      )}
    </div>
  );
}
