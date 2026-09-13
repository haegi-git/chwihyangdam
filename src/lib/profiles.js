export const PROFILE_UPDATED_EVENT = "chwihyangdam:profile";
export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const AVATAR_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

export function avatarExtension(file) {
  return AVATAR_EXTENSIONS[file?.type] || "";
}

export function avatarObjectPath(userId, file) {
  const ext = avatarExtension(file);
  return `${userId}/avatar-${Date.now()}.${ext}`;
}

export function validateAvatarFile(file) {
  if (!file) {
    return "사진을 골라 주세요.";
  }

  if (!AVATAR_EXTENSIONS[file.type]) {
    return "jpeg, png, webp, gif 사진만 담을 수 있습니다.";
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return "5MB보다 큰 사진은 담을 수 없습니다.";
  }

  return "";
}

export function avatarErrorMessage(error) {
  const text = String(error?.message ?? "").toLowerCase();

  if (text.includes("size") || text.includes("exceed") || text.includes("too large")) {
    return "5MB보다 큰 사진은 담을 수 없습니다.";
  }

  if (text.includes("mime") || text.includes("type")) {
    return "jpeg, png, webp, gif 사진만 담을 수 있습니다.";
  }

  return "사진을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export function withCacheBust(url) {
  if (!url) {
    return "";
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${Date.now()}`;
}
