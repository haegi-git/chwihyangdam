"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const TITLE_MAX = 80;
const BODY_MAX = 4000;

export default function HobbyPostForm({
  mode = "create",
  tag,
  post,
  cancelHref,
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const isEdit = mode === "edit";

  async function handleSubmit(event) {
    event.preventDefault();

    const nextTitle = title.trim().slice(0, TITLE_MAX);
    const nextBody = body.trim().slice(0, BODY_MAX);

    if (!nextTitle || !nextBody) {
      setError("제목과 내용을 모두 적어 주세요.");
      return;
    }

    if (!configured) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPending(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending(false);
      const nextPath = isEdit
        ? `/hobbies/post/${post.id}/edit`
        : `/hobbies/${tag.slug}/new`;
      router.replace(loginHref(nextPath));
      return;
    }

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("hobby_posts")
        .update({
          title: nextTitle,
          body: nextBody,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .eq("author_id", user.id);

      setPending(false);

      if (updateError) {
        setError("글을 고치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }

      router.push(`/hobbies/post/${post.id}`);
      router.refresh();
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("hobby_posts")
      .insert({
        author_id: user.id,
        hobby_tag_id: tag.id,
        title: nextTitle,
        body: nextBody,
      })
      .select("id")
      .maybeSingle();

    setPending(false);

    if (insertError || !created?.id) {
      setError("글을 남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    router.push(`/hobbies/post/${created.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="paper-sheet rise-in rise-in-3 rounded-[1.85rem] p-7 md:p-10"
    >
      <p className="kicker">{tag.name}</p>
      <h2 className="display mt-5 text-3xl text-ink md:text-4xl">
        {isEdit ? "글 고치기" : "글 남기기"}
      </h2>
      <p className="mt-4 leading-8 text-ink-soft">
        {isEdit
          ? "천천히 다듬어도 좋습니다. 고친 글은 이 자리에 그대로 남습니다."
          : "짧게라도 좋습니다. 이 취향을 곁에 둔 마음을 조용히 적어 주세요."}
      </p>

      <label className="mt-8 block text-sm text-ink-soft" htmlFor="hobby-post-title">
        제목
      </label>
      <input
        id="hobby-post-title"
        value={title}
        onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX))}
        className="field-quiet mt-2 rounded-2xl px-4 py-3"
        placeholder="오늘의 한 조각"
        maxLength={TITLE_MAX}
      />
      <p className="mt-2 text-xs tracking-wide text-ink-soft">
        {title.trim().length}/{TITLE_MAX}
      </p>

      <label className="mt-6 block text-sm text-ink-soft" htmlFor="hobby-post-body">
        내용
      </label>
      <textarea
        id="hobby-post-body"
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, BODY_MAX))}
        rows={10}
        className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
        placeholder="천천히, 짧게라도 좋아요."
        maxLength={BODY_MAX}
      />
      <p className="mt-2 text-xs tracking-wide text-ink-soft">
        {body.trim().length}/{BODY_MAX}
      </p>

      {error ? (
        <p className="mt-5 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={cancelHref} className="btn-ghost">
          돌아가기
        </Link>
        <button type="submit" className="btn-quiet" disabled={pending}>
          {pending ? "담는 중…" : isEdit ? "고친 글 담기" : "글 남기기"}
        </button>
      </div>
    </form>
  );
}
