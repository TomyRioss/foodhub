import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedGoogleProfile } from "@/lib/auth-policy";
import { getIntegration, saveIntegration } from "@/lib/pocketbase";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
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
