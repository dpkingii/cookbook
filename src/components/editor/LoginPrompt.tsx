import { textLink } from "@/components/ui/styles";
import { sectionTitle } from "./ui";

export function LoginPrompt({ message = "Log in to save recipes" }: { message?: string }) {
  return (
    <div role="alert" className="border border-[var(--ink)] p-4 text-base">
      <p className={`${sectionTitle} text-xl`}>{message}</p>
      <p className="mt-1">
        <a href="/login" target="_blank" className={textLink}>
          Log in
        </a>{" "}
        or{" "}
        <a href="/signup" target="_blank" className={textLink}>
          create an account
        </a>{" "}
        in a new tab, then come back and press Save recipe again. Your draft stays right here.
      </p>
    </div>
  );
}
