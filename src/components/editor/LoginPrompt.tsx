export function LoginPrompt({ message = "Log in to save recipes" }: { message?: string }) {
  return (
    <div role="alert" className="rounded-2xl border-2 border-[var(--ink)] bg-[#fbf0cf] p-4 text-lg">
      <p className="font-serif text-2xl font-semibold">{message}</p>
      <p className="mt-1">
        <a href="/login" target="_blank" className="font-semibold underline underline-offset-4">
          Log in
        </a>{" "}
        or{" "}
        <a href="/signup" target="_blank" className="font-semibold underline underline-offset-4">
          create an account
        </a>{" "}
        in a new tab, then come back and press Save recipe again. Your draft stays right here.
      </p>
    </div>
  );
}
