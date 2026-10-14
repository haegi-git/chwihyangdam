import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callbackRedirectBase, getSafeNext } from "./paths.js";

describe("auth next path", () => {
  it("keeps an in-app path and drops open redirects", () => {
    assert.equal(getSafeNext("/friends"), "/friends");
    assert.equal(getSafeNext("//evil.com"), "/");
    assert.equal(getSafeNext("https://evil.com"), "/");
    assert.equal(getSafeNext("/\\evil.com"), "/");
    assert.equal(getSafeNext("/safe\nset-cookie"), "/");
    assert.equal(getSafeNext("/%5cevil.com"), "/");
    assert.equal(getSafeNext("/%0aevil.com"), "/");
  });

  it("uses x-forwarded-host only when it is the app origin", () => {
    const origin = "https://chwihyangdam.example";
    const allowed = callbackRedirectBase({
      origin,
      forwardedHost: "chwihyangdam.example",
      siteUrl: "https://chwihyangdam.example",
      isLocalEnv: false,
    });
    const blocked = callbackRedirectBase({
      origin,
      forwardedHost: "evil.com",
      siteUrl: "https://chwihyangdam.example",
      isLocalEnv: false,
    });
    const local = callbackRedirectBase({
      origin: "http://localhost:3000",
      forwardedHost: "evil.com",
      siteUrl: "https://chwihyangdam.example",
      isLocalEnv: true,
    });

    assert.equal(allowed, "https://chwihyangdam.example");
    assert.equal(blocked, origin);
    assert.equal(local, "http://localhost:3000");
  });
});
