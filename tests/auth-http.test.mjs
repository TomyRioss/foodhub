import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { encode } from "next-auth/jwt";

// Integration checks against a separately started local Next.js server.
const origin = process.env.AUTH_TEST_URL ?? "http://localhost:3100";
const secret = process.env.AUTH_SECRET ?? readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((line) => line.startsWith("AUTH_SECRET="))
  ?.slice("AUTH_SECRET=".length);
assert.ok(secret, "AUTH_SECRET is required for local integration tests");
const cookieName = "authjs.session-token";

async function sessionCookie(email, maxAge = 3600) {
  const token = await encode({
    token: { email, name: "Local auth test", sub: "local-test" },
    secret,
    salt: cookieName,
    maxAge,
  });
  return `${cookieName}=${token}`;
}

async function home(cookie) {
  const response = await fetch(origin, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return { response, body: await response.text() };
}

test("anonymous users cannot view the protected page", async () => {
  const { response, body } = await home();
  assert.ok(response.status < 500);
  assert.ok(body.includes("/api/auth/signin") || response.headers.get("location")?.includes("/api/auth/signin"));
  assert.ok(!body.includes("Pedidos, en orden."));
  const session = await fetch(`${origin}/api/auth/session`);
  assert.equal(await session.json(), null);
});

test("a locally signed allowed session can view the protected page", async () => {
  const { response, body } = await home(await sessionCookie("atuantojofl@gmail.com"));
  assert.equal(response.status, 200);
  assert.ok(body.includes("Pedidos, en orden."));
});

test("even a signed session for another account is denied", async () => {
  const { body } = await home(await sessionCookie("other@gmail.com"));
  assert.ok(!body.includes("Pedidos, en orden."));
  assert.ok(body.includes("/api/auth/signin"));
});

test("tampered and expired sessions cannot view the protected page", async () => {
  for (const cookie of [`${cookieName}=tampered`, await sessionCookie("atuantojofl@gmail.com", -3600)]) {
    const { body } = await home(cookie);
    assert.ok(!body.includes("Pedidos, en orden."));
    assert.ok(body.includes("/api/auth/signin"));
  }
});

test("a callback without a completed OAuth flow cannot create a session", async () => {
  const callback = await fetch(`${origin}/api/auth/callback/google`, { redirect: "manual" });
  assert.equal(callback.status, 302);
  assert.ok(callback.headers.get("location")?.includes("/api/auth/"));
  assert.ok(!(callback.headers.get("set-cookie") ?? "").includes(`${cookieName}=`));
});

test("signing out clears an existing local session with CSRF protection", async () => {
  const session = await sessionCookie("atuantojofl@gmail.com");
  const csrfResponse = await fetch(`${origin}/api/auth/csrf`);
  const { csrfToken } = await csrfResponse.json();
  const csrfCookies = csrfResponse.headers.getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const response = await fetch(`${origin}/api/auth/signout`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie: `${session}; ${csrfCookies}` },
    body: new URLSearchParams({ csrfToken, callbackUrl: origin }),
  });
  assert.equal(response.status, 302);
  assert.ok(response.headers.getSetCookie().some((cookie) =>
    cookie.startsWith(`${cookieName}=;`) && cookie.includes("Max-Age=0"),
  ));
});
