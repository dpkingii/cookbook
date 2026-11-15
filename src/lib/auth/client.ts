import { createAuthClient } from "better-auth/react";
import { anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [anonymousClient()] });

let pending: Promise<void> | null = null;

export function ensureViewer(): Promise<void> {
  pending ??= (async () => {
    const { data } = await authClient.getSession();
    if (data) return;
    const { error } = await authClient.signIn.anonymous();
    if (error) throw new Error(error.message ?? "Could not start a guest session");
  })().finally(() => {
    pending = null;
  });
  return pending;
}
