export function getSafeNext(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export function loginHref(next) {
  const safe = getSafeNext(next);

  if (safe === "/") {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(safe)}`;
}
