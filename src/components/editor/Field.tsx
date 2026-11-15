import type { ReactNode } from "react";
import { labelClass } from "./ui";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: FieldControlProps) => ReactNode;
}) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-[var(--ink-soft)]">
          {hint}
        </p>
      )}
      <div className="mt-1">
        {children({
          id,
          "aria-describedby": describedBy || undefined,
          "aria-invalid": error ? true : undefined,
        })}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-base font-semibold text-[var(--tomato-deep)]">
          {error}
        </p>
      )}
    </div>
  );
}
