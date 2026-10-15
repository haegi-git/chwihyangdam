export const TERMS_VERSION = "2026-10-15";
export const TERMS_EFFECTIVE_LABEL = "2026년 10월 15일";
export const OPERATOR_NAME = "[운영자 이름 입력]";
export const CONTACT_LINE = "문의: [이메일 주소 입력]";

// Replace this address before publication. The pages show CONTACT_LINE as the visible placeholder.
export const CONTACT_MAILTO = "mailto:privacy@example.com";

const EXEMPT_PREFIXES = ["/terms", "/privacy", "/guide", "/consent", "/login"];

export function needsTermsConsent(row) {
  if (!row?.terms_agreed_at) {
    return true;
  }

  return row.terms_version !== TERMS_VERSION;
}

export function isConsentExempt(pathname) {
  if (typeof pathname !== "string" || !pathname) {
    return false;
  }

  return EXEMPT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
