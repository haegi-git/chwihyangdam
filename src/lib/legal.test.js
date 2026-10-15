import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isConsentExempt, needsTermsConsent, TERMS_VERSION } from "./legal.js";
import { reportErrorMessage } from "./moderation.js";

describe("terms consent", () => {
  it("asks again when consent is missing or the version changed", () => {
    assert.equal(needsTermsConsent(null), true);
    assert.equal(needsTermsConsent({ terms_agreed_at: null, terms_version: null }), true);
    assert.equal(
      needsTermsConsent({ terms_agreed_at: "2026-10-15T00:00:00Z", terms_version: "2026-01-01" }),
      true,
    );
    assert.equal(
      needsTermsConsent({ terms_agreed_at: "2026-10-15T00:00:00Z", terms_version: TERMS_VERSION }),
      false,
    );
  });

  it("leaves legal pages, consent, and login outside the gate", () => {
    assert.equal(isConsentExempt("/privacy"), true);
    assert.equal(isConsentExempt("/terms"), true);
    assert.equal(isConsentExempt("/guide"), true);
    assert.equal(isConsentExempt("/consent"), true);
    assert.equal(isConsentExempt("/login"), true);
    assert.equal(isConsentExempt("/hobbies"), false);
    assert.equal(isConsentExempt("/"), false);
  });
});

describe("report copy", () => {
  it("uses a plain sentence for a duplicate report", () => {
    assert.equal(reportErrorMessage({ code: "23505" }), "이미 신고한 내용이에요");
  });
});
