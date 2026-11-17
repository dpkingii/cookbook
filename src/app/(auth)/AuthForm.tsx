"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonPrimary, display, input, textLink } from "@/components/ui/styles";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

const COPY = {
  login: {
    kicker: "Welcome back",
    title: "Log in",
    lead: "Pick up where your last cook left off.",
    submit: "Log in",
    busy: "Logging in…",
    switchText: "New here?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    kicker: "Join the kitchen",
    title: "Sign up",
    lead: "Anything you cooked as a guest comes with you.",
    submit: "Create account",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLabel: "Log in",
    switchHref: "/login",
  },
} as const;

const label = "block text-base font-medium";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setError(null);
    setSubmitting(true);

    const { error: failure } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "").trim() })
        : await authClient.signIn.email({ email, password });

    if (failure) {
      setError(failure.message ?? "Something went wrong. Try again.");
      setSubmitting(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const fieldClass = cn(
    input,
    "mt-1 min-h-12 aria-[invalid=true]:border-[var(--danger)] aria-[invalid=true]:outline-[var(--accent)] disabled:opacity-60",
  );
  const invalid = error ? true : undefined;

  return (
    <main data-tone="sun" className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 py-8 text-[var(--ink)]">
      <Link href="/" className={cn(display, "inline-flex min-h-11 items-center self-start text-2xl")}>
        Cookbook
      </Link>
      <p className="label-caps mt-12">{copy.kicker}</p>
      <h1 className={cn(display, "mt-2 text-3xl sm:text-4xl")}>{copy.title}</h1>
      <p className="mt-2 text-base text-[var(--mute)]">{copy.lead}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5" aria-busy={submitting}>
        {mode === "signup" && (
          <label className={label}>
            Name
            <input
              name="name"
              type="text"
              autoComplete="name"
              required
              disabled={submitting}
              className={fieldClass}
            />
          </label>
        )}
        <label className={label}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={submitting}
            aria-invalid={invalid}
            className={fieldClass}
          />
        </label>
        <label className={label}>
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            disabled={submitting}
            aria-invalid={invalid}
            aria-describedby={mode === "signup" ? "password-hint" : undefined}
            className={fieldClass}
          />
          {mode === "signup" && (
            <span id="password-hint" className="mt-1 block text-sm font-normal text-[var(--mute)]">
              At least 8 characters.
            </span>
          )}
        </label>

        <p role="alert" className={error ? "text-sm font-medium text-[var(--danger)]" : "sr-only"}>
          {error}
        </p>

        <button type="submit" disabled={submitting} className={cn(buttonPrimary, "w-full disabled:cursor-wait")}>
          {submitting ? copy.busy : copy.submit}
        </button>
      </form>

      <p className="mt-8 text-base text-[var(--mute)]">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className={cn(textLink, "text-[var(--ink)]")}>
          {copy.switchLabel}
        </Link>
      </p>
    </main>
  );
}
