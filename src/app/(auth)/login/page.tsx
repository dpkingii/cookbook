import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Log in · Cookbook" };

export default async function Page() {
  const viewer = await getViewer();
  if (viewer && !viewer.isGuest) redirect("/");
  return <AuthForm mode="login" />;
}
