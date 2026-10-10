import "server-only";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth-policy";

export async function apiSession() {
  const session = await auth();
  return session?.user && isAllowedEmail(session.user.email) ? session : null;
}

export function validMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : requestOrigin;
  return origin === requestOrigin || origin === configuredOrigin;
}
