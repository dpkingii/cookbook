"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { buttonGhost } from "@/components/ui/styles";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={buttonGhost}>
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
