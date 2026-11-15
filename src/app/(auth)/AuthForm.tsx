"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";

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

const fieldClass =
  "mt-1 w-full rounded-xl border-2 border-[var(--ink)] bg-white/60 px-4 py-3 text-lg text-[var(--ink)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--gold)] disabled:opacity-60";

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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10 text-[var(--ink)]">
      <Link href="/" className="font-serif text-2xl font-bold">
        Cookbook
      </Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">
        {copy.kicker}
      </p>
      <h1 className="mt-1 font-serif text-4xl font-semibold leading-tight">{copy.title}</h1>
      <p className="mt-2 text-lg text-[var(--ink-soft)]">{copy.lead}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" aria-busy={submitting}>
        {mode === "signup" && (
          <label className="block text-base font-semibold">
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
        <label className="block text-base font-semibold">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={submitting}
            className={fieldClass}
          />
        </label>
        <label className="block text-base font-semibold">
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            disabled={submitting}
            aria-describedby={mode === "signup" ? "password-hint" : undefined}
            className={fieldClass}
          />
          {mode === "signup" && (
            <span id="password-hint" className="mt-1 block text-sm font-normal text-[var(--ink-soft)]">
              At least 8 characters.
            </span>
          )}
        </label>

        <p
          role="alert"
          className={
            error
              ? "rounded-xl border-2 border-[var(--tomato-deep)] bg-[var(--tomato)]/10 px-4 py-3 font-semibold text-[var(--tomato-deep)]"
              : "sr-only"
          }
        >
          {error}
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full border-2 border-[var(--ink)] bg-[var(--tomato)] py-4 text-xl font-bold text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? copy.busy : copy.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-lg text-[var(--ink-soft)]">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-semibold text-[var(--tomato-deep)] underline underline-offset-4">
          {copy.switchLabel}
        </Link>
      </p>
    </main>
  );
}
