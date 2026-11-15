import { headers } from "next/headers";
import { auth } from "./server";

export interface Viewer {
  id: string;
  name: string | null;
  email: string | null;
  isGuest: boolean;
}

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  const isGuest = user.isAnonymous === true;
  return {
    id: user.id,
    name: isGuest ? null : user.name,
    email: isGuest ? null : user.email,
    isGuest,
  };
}
