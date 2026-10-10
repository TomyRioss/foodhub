export const MVP_ACCOUNT_EMAIL = "atuantojofl@gmail.com";

export function isAllowedEmail(email: unknown): boolean {
  return (
    typeof email === "string" &&
    email.trim().toLowerCase() === MVP_ACCOUNT_EMAIL
  );
}

export function isAllowedGoogleProfile(
  provider: string | undefined,
  profile: { email?: unknown; email_verified?: unknown } | undefined,
): boolean {
  return (
    provider === "google" &&
    profile?.email_verified === true &&
    isAllowedEmail(profile.email)
  );
}
