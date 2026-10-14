const UNSAFE_NEXT = /[\\\u0000-\u001F\u007F]/;
const UNSAFE_NEXT_ENCODED = /%(?:5c|00|0a|0d)/i;

export function getSafeNext(next) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }

  if (UNSAFE_NEXT.test(next) || UNSAFE_NEXT_ENCODED.test(next)) {
    return "/";
  }

  return next;
}

function hostOf(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return "";
  }
}

export function callbackRedirectBase({ origin, forwardedHost, siteUrl, isLocalEnv = false }) {
  if (!origin || isLocalEnv) {
    return origin || "";
  }

  const forwarded = String(forwardedHost ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!forwarded || /[\s\\/@]/.test(forwarded)) {
    return origin;
  }

  const allowed = new Set([hostOf(siteUrl), hostOf(origin)].filter(Boolean));

  if (allowed.has(forwarded)) {
    return `https://${forwarded}`;
  }

  return origin;
}

export function loginHref(next) {
  const safe = getSafeNext(next);

  if (safe === "/") {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(safe)}`;
}
