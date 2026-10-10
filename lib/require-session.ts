import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth-policy";

/** Call at each protected page or Server Action before accessing private data. */
export async function requireSession() {
  await connection();
  const session = await auth();

  if (!session?.user || !isAllowedEmail(session.user.email)) {
    redirect("/api/auth/signin?callbackUrl=%2F");
  }

  return session;
}
