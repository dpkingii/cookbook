import { SiteHeader } from "@/components/site/SiteHeader";
import { NewRecipeFlow } from "@/components/editor/NewRecipeFlow";
import { getViewer } from "@/lib/auth/viewer";

export const metadata = { title: "New recipe" };

export default async function NewRecipePage() {
  const viewer = await getViewer();
  return (
    <div className="min-h-dvh bg-[var(--paper)] text-[var(--ink)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--tomato-deep)]">New recipe</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Turn a recipe into a cook-along.
        </h1>
        <p className="mt-3 mb-8 max-w-xl text-xl text-[var(--ink-soft)]">
          Paste the text or a link. You can fix every step before you save, and watch each one play as you edit.
        </p>
        <NewRecipeFlow canSave={Boolean(viewer && !viewer.isGuest)} />
      </main>
    </div>
  );
}
