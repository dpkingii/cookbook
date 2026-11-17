"use client";

import { useRef, useState, type ReactNode } from "react";
import { shrinkPhoto } from "@/lib/photos/client";

/** Opens the camera or the photo library, and hands back a photo already shrunk for upload. */
export function PhotoButton({
  className,
  children,
  onPhoto,
  onError,
}: {
  className: string;
  children: ReactNode;
  onPhoto: (photo: Blob) => void;
  onError: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        aria-label="Photo of your dish"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onPhoto(await shrinkPhoto(file));
          } catch {
            onError();
          } finally {
            setBusy(false);
          }
        }}
      />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={className}>
        {children}
      </button>
    </>
  );
}
