"use client";

import { useState, type ReactNode } from "react";
import { EmptyPlate } from "@/components/photo/EmptyPlate";
import { PhotoButton } from "@/components/photo/PhotoButton";
import { buttonGhost, buttonPrimary } from "@/components/ui/styles";
import { Footer } from "./Footer";

function Frame({ caption, className = "", large = false, children }: { caption: string; className?: string; large?: boolean; children: ReactNode }) {
  return (
    <figure className={`sheet p-2 ${className}`}>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-[var(--wash)]">{children}</div>
      <figcaption className={`px-1 pb-1 pt-3 ${large ? "font-serif text-xl font-medium leading-snug" : "text-sm font-semibold"}`}>
        {caption}
      </figcaption>
    </figure>
  );
}

export function FinishPhoto({
  title,
  preview,
  before,
  onPhoto,
  onNext,
  onBack,
}: {
  title: string;
  preview: string | null;
  /** Last time's photo of this recipe, to put next to today's. */
  before: { url: string; when: string } | null;
  onPhoto: (photo: Blob) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const pick = (photo: Blob) => {
    setFailed(false);
    onPhoto(photo);
  };
  const fail = () => setFailed(true);

  return (
    <>
      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-6">
        <p className="label-caps">Plate up</p>
        <h1 tabIndex={-1} className="mt-2 font-serif text-3xl font-medium leading-[1.1] tracking-[-0.02em] outline-none sm:text-4xl">
          {preview ? "That is your cooking." : "Take a photo of your plate."}
        </h1>
        <p className="mt-3 text-lg leading-snug text-[var(--mute)]">
          {before
            ? preview
              ? "Last time on the left, today on the right. Only you can see these."
              : "Here is how it looked last time. Take today's and put them side by side."
            : preview
              ? "It goes in your history next to this cook. Only you can see it."
              : "Every cook ends with a picture. Next time you make this, you will see how far you have come."}
        </p>

        {before ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5">
            <Frame caption={`Last time · ${before.when}`} className="-rotate-2 motion-reduce:rotate-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- private photo served by our own route */}
              <img src={before.url} alt={`Your ${title} last time`} className="h-full w-full object-cover" />
            </Frame>
            <Frame caption="Today" className="rotate-1 motion-reduce:rotate-0">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo just taken
                <img src={preview} alt={`Your ${title}`} className="h-full w-full object-cover" />
              ) : (
                <EmptyPlate className="w-4/5" />
              )}
            </Frame>
          </div>
        ) : (
          <Frame caption={title} className="mt-6" large>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the photo just taken
              <img src={preview} alt={`Your ${title}`} className="h-full w-full object-cover" />
            ) : (
              <EmptyPlate className="w-3/5" />
            )}
          </Frame>
        )}

        {failed && (
          <p role="alert" className="mt-4 text-base text-[var(--danger)]">
            That file could not be read as a photo. Try another one.
          </p>
        )}
      </div>

      <Footer>
        <button type="button" onClick={onBack} className={buttonGhost}>
          Back
        </button>
        {preview ? (
          <>
            <PhotoButton className={buttonGhost} onPhoto={pick} onError={fail}>
              Retake
            </PhotoButton>
            <button type="button" onClick={onNext} className={`${buttonPrimary} flex-1`}>
              Use this photo
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onNext} className={buttonGhost}>
              Skip
            </button>
            <PhotoButton className={`${buttonPrimary} flex-1`} onPhoto={pick} onError={fail}>
              Add a photo
            </PhotoButton>
          </>
        )}
      </Footer>
    </>
  );
}
