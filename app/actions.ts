"use server";

import { signIn, signOut } from "@/auth";
import { requireSession } from "@/lib/require-session";

export async function connectGmail() {
  await requireSession();
  await signIn("google", { redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/api/auth/signin" });
}
