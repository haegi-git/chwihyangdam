export const PROFILE_UPDATED_EVENT = "chwihyangdam:profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProfileId(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function displayNameFromAuth(user) {
  if (!user) {
    return "";
  }

  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.nickname ||
    user.email ||
    ""
  );
}

export function avatarUrlFromAuth(user) {
  if (!user) {
    return "";
  }

  return user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
}

export function profileLabel(profile, user) {
  const fromProfile = profile?.display_name?.trim();
  if (fromProfile) {
    return fromProfile;
  }

  return user?.email || displayNameFromAuth(user) || "나";
}

export function profileAvatarUrl(profile, user) {
  return profile?.avatar_url?.trim() || avatarUrlFromAuth(user) || "";
}

export function announceProfileUpdate(profile) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: profile }));
}
