import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAllowedEmail,
  isAllowedGoogleProfile,
} from "../lib/auth-policy.ts";

test("only the configured account is allowed, ignoring case and whitespace", () => {
  assert.equal(isAllowedEmail(" ATUANTOJOFL@gmail.com "), true);
  for (const email of [undefined, null, "", "other@gmail.com", "atuantojofl@gmail.com.attacker.test", 1]) {
    assert.equal(isAllowedEmail(email), false);
  }
});

test("Google sign-in requires an explicitly verified email", () => {
  assert.equal(isAllowedGoogleProfile("google", { email: "atuantojofl@gmail.com", email_verified: true }), true);
  for (const verified of [false, undefined, "true", 1]) {
    assert.equal(isAllowedGoogleProfile("google", { email: "atuantojofl@gmail.com", email_verified: verified }), false);
  }
  assert.equal(isAllowedGoogleProfile("credentials", { email: "atuantojofl@gmail.com", email_verified: true }), false);
  assert.equal(isAllowedGoogleProfile("google", { email: "other@gmail.com", email_verified: true }), false);
  assert.equal(isAllowedGoogleProfile("google", undefined), false);
});
