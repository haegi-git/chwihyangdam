export const BLOCK_SELECT = "blocker_id, blocked_id, created_at";

export function canBlock(userId, profileId) {
  return Boolean(userId && profileId && userId !== profileId);
}

export function blockErrorMessage(error) {
  const code = String(error?.code ?? "");

  if (code === "23514") {
    return "나를 차단할 수는 없습니다.";
  }

  if (code === "23505") {
    return "";
  }

  return "지금은 차단하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export function unblockErrorMessage() {
  return "지금은 차단을 풀지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

export async function viewerHasBlocked(supabase, userId, profileId) {
  if (!canBlock(userId, profileId)) {
    return false;
  }

  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId)
    .eq("blocked_id", profileId)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data);
}
