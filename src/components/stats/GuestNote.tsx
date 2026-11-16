import Link from "next/link";
import { textLink } from "@/components/ui/styles";

export function GuestNote() {
  return (
    <p className="mt-4 max-w-md text-base text-[var(--mute)]">
      This history is kept on this device.{" "}
      <Link href="/signup" className={`${textLink} text-[var(--ink)]`}>
        Sign up
      </Link>{" "}
      to keep it on every device.
    </p>
  );
}
