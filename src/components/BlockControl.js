"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { blockErrorMessage, canBlock, unblockErrorMessage } from "@/lib/blocks";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const BLOCK_CONFIRM =
  "이 사람을 차단할까요? 서로의 친구 자리가 사라지고, 서로의 글과 댓글이 더 이상 보이지 않습니다.";
const UNBLOCK_CONFIRM =
  "차단을 풀까요? 서로의 글과 댓글이 다시 보입니다. 친구 관계는 저절로 돌아오지 않습니다.";

export default function BlockControl(props) {
  return (
    <BlockButton
      key={`${props.profileId}:${props.blocked ? "1" : "0"}`}
      {...props}
    />
  );
}

function BlockButton({
  profileId,
  currentUserId = null,
  blocked = false,
  appearance = "menu",
  disabled = false,
  onChanged,
}) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(blocked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!canBlock(currentUserId, profileId)) {
    return null;
  }

  async function handleClick() {
    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    const nextBlocked = !isBlocked;
    const confirmed = window.confirm(nextBlocked ? BLOCK_CONFIRM : UNBLOCK_CONFIRM);

    if (!confirmed) {
      return;
    }

    setPending(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !canBlock(user.id, profileId)) {
      setPending(false);
      setError("들어와 있으면 차단할 수 있습니다.");
      return;
    }

    if (nextBlocked) {
      const { error: insertError } = await supabase.from("user_blocks").insert({
        blocker_id: user.id,
        blocked_id: profileId,
      });
      const message = insertError ? blockErrorMessage(insertError) : "";

      if (insertError && message) {
        setPending(false);
        setError(message);
        return;
      }
    } else {
      const { error: deleteError } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", profileId);

      if (deleteError) {
        setPending(false);
        setError(unblockErrorMessage());
        return;
      }
    }

    setIsBlocked(nextBlocked);
    setPending(false);
    onChanged?.(nextBlocked);
    router.refresh();
  }

  const label = pending ? (isBlocked ? "푸는 중…" : "차단하는 중…") : isBlocked ? "차단 해제" : "차단하기";
  const className =
    appearance === "button"
      ? "btn-ghost disabled:opacity-60"
      : appearance === "item"
        ? "account-menu-item cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        : "text-sm text-ink-soft underline-offset-8 transition-colors duration-500 hover:text-sage-deep hover:underline disabled:opacity-50";
  const wrapClass =
    appearance === "button"
      ? "inline-flex flex-col items-start"
      : appearance === "item"
        ? "block"
        : "inline-flex flex-col";

  return (
    <span className={wrapClass}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={disabled || pending}
      >
        {label}
      </button>
      {error ? (
        <span className="mt-2 text-sm leading-7 text-clay" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
