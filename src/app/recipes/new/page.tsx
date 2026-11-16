import Link from "next/link";
import { NewRecipeFlow } from "@/components/editor/NewRecipeFlow";
import { display, textLink } from "@/components/ui/styles";
import { getViewer } from "@/lib/auth/viewer";

export const metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  const viewer = await getViewer();
  return (
    <div className="min-h-dvh bg-white text-[var(--ink)]">
      <main className="mx-auto max-w-5xl px-5 py-6 sm:px-6 md:py-10">
        <Link href="/" className={`${textLink} inline-flex min-h-11 items-center`}>
          Back to recipes
        </Link>
        <p className="label-caps mt-6">New recipe</p>
        <h1 className={`${display} mt-2 text-3xl sm:text-4xl`}>Turn a recipe into a cook-along.</h1>
        <p className="mb-8 mt-3 max-w-xl text-base text-[var(--mute)]">
          Paste the text or a link. You can fix every step before you save, and watch each one play as you edit.
        </p>
        <NewRecipeFlow canSave={Boolean(viewer && !viewer.isGuest)} />
      </main>
    </div>
  );
}
