import NextAuth, { customFetch } from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedGoogleProfile } from "@/lib/auth-policy";
import { getIntegration, saveIntegration } from "@/lib/pocketbase";

const googleProviderFetch: typeof fetch = async (...args) => {
  const response = await fetch(...args);
  const [request] = args;
  const requestUrl = new URL(
    request instanceof Request ? request.url : request.toString(),
  );

  if (
    requestUrl.href !==
      "https://accounts.google.com/.well-known/openid-configuration" ||
    !response.ok
  ) {
    return response;
  }

  const metadata = (await response.clone().json()) as Record<string, unknown>;

  if (metadata.authorization_response_iss_parameter_supported !== true) {
    return response;
  }

  // Production callbacks omit `iss` despite Google's discovery metadata requiring it.
  // Keep state, PKCE, nonce, and ID-token issuer validation enabled.
  return Response.json(
    { ...metadata, authorization_response_iss_parameter_supported: false },
    {
      status: response.status,
      headers: {
        "cache-control": response.headers.get("cache-control") ?? "no-store",
      },
    },
  );
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      [customFetch]: googleProviderFetch,
      checks: ["pkce", "state", "nonce"],
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
          prompt: "consent select_account",
          access_type: "offline",
          include_granted_scopes: "true",
          login_hint: "atuantojofl@gmail.com",
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    signIn({ account, profile }) {
      return isAllowedGoogleProfile(account?.provider, profile);
    },
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.access_token && account.scope?.includes("gmail.readonly")) {
        const previous = await getIntegration();
        await saveIntegration({
          accessToken: account.access_token,
          refreshToken: account.refresh_token ?? previous?.refreshToken,
          expiresAt: (account.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
          scope: account.scope,
          email: token.email ?? undefined,
          lastSyncedAt: previous?.lastSyncedAt,
        });
      }
      return token;
    },
  },
});
