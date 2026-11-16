"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { errorClass, primaryButton, secondaryButton, sectionTitle } from "./ui";

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2.5rem)] max-w-md border border-[var(--ink)] bg-white p-6 text-[var(--ink)] backdrop:bg-[var(--ink)]/40"
    >
      <h2 id="confirm-title" className={`${sectionTitle} leading-tight`}>
        {title}
      </h2>
      <div className="mt-2 text-base text-[var(--mute)]">{children}</div>
      {error && (
        <p role="alert" className={`mt-3 ${errorClass}`}>
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onConfirm} disabled={busy} className={primaryButton}>
          {busy ? "Working…" : confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={secondaryButton} autoFocus>
          {cancelLabel}
        </button>
      </div>
    </dialog>
  );
}
