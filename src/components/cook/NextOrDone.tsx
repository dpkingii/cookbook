import Link from "next/link";
import { buttonPrimary } from "@/components/ui/styles";

/** The last screen of the finish flow sends the cook home rather than to another screen. */
export function NextOrDone({ last, onNext, disabled }: { last: boolean; onNext: () => void; disabled?: boolean }) {
  if (last)
    return (
      <Link href="/" className={`${buttonPrimary} flex-1`}>
        Done
      </Link>
    );
  return (
    <button type="button" onClick={onNext} disabled={disabled} className={`${buttonPrimary} flex-1`}>
      Next
    </button>
  );
}
