"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeOwnedPostImages } from "@/lib/post-images";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function HobbyPostActions({ postId, tagSlug, imageUrls = [] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    const confirmed = window.confirm("이 글을 거두어 둘까요? 목록에서 사라집니다.");

    if (!confirmed) {
      return;
    }

    setPending(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: deleteError } = await supabase.from("hobby_posts").delete().eq("id", postId);

    if (deleteError) {
      setPending(false);
      setError("글을 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    if (user) {
      await removeOwnedPostImages(supabase, user.id, imageUrls);
    }

    setPending(false);
    router.push(tagSlug ? `/hobbies/${tagSlug}` : "/hobbies");
    router.refresh();
  }

  return (
    <div className="mt-10 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/hobbies/post/${postId}/edit`} className="btn-ghost">
          고치기
        </Link>
        <button type="button" className="btn-ghost" onClick={handleDelete} disabled={pending}>
          {pending ? "거두는 중…" : "거두기"}
        </button>
      </div>
      {error ? (
        <p className="text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
