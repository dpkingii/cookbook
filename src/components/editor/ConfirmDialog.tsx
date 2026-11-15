"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { primaryButton, secondaryButton } from "./ui";

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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] p-6 text-[var(--ink)] shadow-[6px_6px_0_var(--ink)] backdrop:bg-[var(--ink)]/50"
    >
      <h2 id="confirm-title" className="font-serif text-3xl font-semibold leading-tight">
        {title}
      </h2>
      <div className="mt-2 text-lg text-[var(--ink-soft)]">{children}</div>
      {error && (
        <p role="alert" className="mt-3 text-base font-semibold text-[var(--tomato-deep)]">
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
