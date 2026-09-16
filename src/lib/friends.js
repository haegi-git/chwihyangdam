import { isProfileId } from "./profiles.js";

export const FRIENDSHIP_SELECT = "id, requester_id, addressee_id, status, created_at, updated_at";
export const PROFILE_FACE_SELECT = "id, display_name, avatar_url";
export const SEARCH_LIMIT = 8;
export const SEARCH_MAX = 40;

export function otherPartyId(friendship, userId) {
  if (!friendship || !userId) {
    return "";
  }

  if (friendship.requester_id === userId) {
    return friendship.addressee_id;
  }

  if (friendship.addressee_id === userId) {
    return friendship.requester_id;
  }

  return "";
}

export function friendshipWith(friendships, userId, otherId) {
  if (!userId || !otherId || userId === otherId) {
    return null;
  }

  return (
    (Array.isArray(friendships) ? friendships : []).find((row) => {
      const other = otherPartyId(row, userId);
      return other === otherId;
    }) ?? null
  );
}

export function relationOf(friendship, userId) {
  if (!friendship || !userId) {
    return "none";
  }

  if (friendship.status === "accepted") {
    return "accepted";
  }

  if (friendship.status === "pending") {
    return friendship.addressee_id === userId ? "incoming" : "outgoing";
  }

  if (friendship.status === "declined") {
    return friendship.addressee_id === userId ? "declined_by_me" : "declined_by_them";
  }

  return "none";
}

export function classifyFriendships(friendships, userId) {
  const incoming = [];
  const outgoing = [];
  const accepted = [];

  for (const row of Array.isArray(friendships) ? friendships : []) {
    const relation = relationOf(row, userId);

    if (relation === "incoming") {
      incoming.push(row);
    } else if (relation === "outgoing") {
      outgoing.push(row);
    } else if (relation === "accepted") {
      accepted.push(row);
    }
  }

  return { incoming, outgoing, accepted };
}

export function sanitizeSearchTerm(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/[%_*]/g, "").slice(0, SEARCH_MAX);
}

export function profileSearchPattern(term) {
  const next = sanitizeSearchTerm(term);
  return next ? `%${next}%` : "";
}

export function looksLikeProfileLink(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  const match = trimmed.match(/(?:^|\/)profile\/([0-9a-f-]{36})\/?$/i);
  if (match && isProfileId(match[1])) {
    return match[1];
  }

  if (isProfileId(trimmed)) {
    return trimmed;
  }

  return "";
}

export function friendDiaryHref(profileId) {
  return `/friends/${profileId}`;
}

export function profileHref(profileId) {
  return `/profile/${profileId}`;
}

export function displayLabel(profile) {
  return profile?.display_name?.trim() || "이름 없는 자리";
}

export function displayAvatar(profile) {
  return profile?.avatar_url?.trim() || "";
}

export function sortByName(rows, profilesById, userId) {
  return [...rows].sort((left, right) => {
    const leftName = displayLabel(profilesById.get(otherPartyId(left, userId)));
    const rightName = displayLabel(profilesById.get(otherPartyId(right, userId)));
    return leftName.localeCompare(rightName, "ko");
  });
}
