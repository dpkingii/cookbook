import Link from "next/link";

export function GuestNote() {
  return (
    <p className="mt-4 max-w-xl border-l-4 border-[var(--gold)] pl-3 text-lg text-[var(--ink-soft)]">
      You are cooking as a guest.{" "}
      <Link href="/signup" className="font-semibold text-[var(--ink)] underline underline-offset-4">
        Sign up
      </Link>{" "}
      to keep this history on every device.
    </p>
  );
}
