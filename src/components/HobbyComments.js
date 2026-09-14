"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HobbyAuthorLink from "@/components/HobbyAuthorLink";
import { formatDate } from "@/lib/dates";
import {
  COMMENT_BODY_MAX,
  commentWasEdited,
  trimCommentBody,
} from "@/lib/hobbies";
import { loginHref } from "@/lib/paths";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function HobbyComments({
  postId,
  comments = [],
  currentUserId = null,
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const signedIn = Boolean(currentUserId);

  function fail(message) {
    setPending("");
    setError(message);
  }

  async function requireUser() {
    if (!configured) {
      fail("저장소가 아직 연결되지 않았습니다.");
      return null;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending("");
      router.replace(loginHref(`/hobbies/post/${postId}`));
      return null;
    }

    return { supabase, user };
  }

  async function handleCreate(event) {
    event.preventDefault();

    const body = trimCommentBody(draft);

    if (!body) {
      setError("한 줄을 적어 주세요.");
      return;
    }

    if (body.length > COMMENT_BODY_MAX) {
      setError(`댓글은 ${COMMENT_BODY_MAX}자까지 담을 수 있습니다.`);
      return;
    }

    setPending("create");
    setError("");

    const session = await requireUser();

    if (!session) {
      return;
    }

    const { error: insertError } = await session.supabase.from("hobby_comments").insert({
      post_id: postId,
      author_id: session.user.id,
      body,
    });

    if (insertError) {
      fail("댓글을 남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setDraft("");
    setPending("");
    router.refresh();
  }

  function startEdit(comment) {
    setEditingId(comment.id);
    setEditDraft(comment.body);
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditDraft("");
  }

  async function handleEdit(event) {
    event.preventDefault();

    const body = trimCommentBody(editDraft);

    if (!body) {
      setError("한 줄을 적어 주세요.");
      return;
    }

    if (body.length > COMMENT_BODY_MAX) {
      setError(`댓글은 ${COMMENT_BODY_MAX}자까지 담을 수 있습니다.`);
      return;
    }

    setPending("edit");
    setError("");

    const session = await requireUser();

    if (!session) {
      return;
    }

    const { error: updateError } = await session.supabase
      .from("hobby_comments")
      .update({
        body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId)
      .eq("author_id", session.user.id);

    if (updateError) {
      fail("댓글을 고치지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    cancelEdit();
    setPending("");
    router.refresh();
  }

  async function handleDelete(commentId) {
    const confirmed = window.confirm("이 댓글을 거두어 둘까요? 글에서 사라집니다.");

    if (!confirmed) {
      return;
    }

    setPending(`delete:${commentId}`);
    setError("");

    const session = await requireUser();

    if (!session) {
      return;
    }

    const { error: deleteError } = await session.supabase
      .from("hobby_comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", session.user.id);

    if (deleteError) {
      fail("댓글을 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setPending("");
    router.refresh();
  }

  return (
    <section
      id="comments"
      className="paper-sheet rise-in rise-in-3 mt-8 rounded-[1.85rem] p-7 md:p-10"
    >
      <p className="kicker">댓글</p>
      <h2 className="display mt-5 text-3xl text-ink">
        {comments.length ? `댓글 ${comments.length}` : "댓글"}
      </h2>

      {comments.length ? (
        <ol className="mt-8 divide-y divide-line/80">
          {comments.map((comment) => {
            const isOwner = currentUserId && currentUserId === comment.author_id;
            const isEditing = editingId === comment.id;
            const deleting = pending === `delete:${comment.id}`;

            return (
              <li key={comment.id} className="py-6 first:pt-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
                  <HobbyAuthorLink author={comment.author} authorId={comment.author_id} />
                  <span aria-hidden="true">·</span>
                  <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                  {commentWasEdited(comment) ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>다듬음</span>
                    </>
                  ) : null}
                </div>

                {isEditing ? (
                  <form onSubmit={handleEdit} className="mt-4">
                    <label className="sr-only" htmlFor={`hobby-comment-edit-${comment.id}`}>
                      댓글 고치기
                    </label>
                    <textarea
                      id={`hobby-comment-edit-${comment.id}`}
                      value={editDraft}
                      rows={3}
                      className="field-quiet resize-y rounded-2xl px-4 py-3"
                      maxLength={COMMENT_BODY_MAX}
                      disabled={pending === "edit"}
                      onChange={(event) =>
                        setEditDraft(event.target.value.slice(0, COMMENT_BODY_MAX))
                      }
                    />
                    <p className="mt-2 text-xs tracking-wide text-ink-soft">
                      {trimCommentBody(editDraft).length}/{COMMENT_BODY_MAX}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="btn-quiet disabled:opacity-60"
                        disabled={pending === "edit"}
                      >
                        {pending === "edit" ? "담는 중…" : "담기"}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost disabled:opacity-60"
                        onClick={cancelEdit}
                        disabled={pending === "edit"}
                      >
                        그만두기
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-4 whitespace-pre-wrap leading-8 text-ink-soft">{comment.body}</p>
                )}

                {isOwner && !isEditing ? (
                  <div className="mt-4 flex flex-wrap gap-4">
                    <button
                      type="button"
                      className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline disabled:opacity-50"
                      onClick={() => startEdit(comment)}
                      disabled={Boolean(pending)}
                    >
                      고치기
                    </button>
                    <button
                      type="button"
                      className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline disabled:opacity-50"
                      onClick={() => handleDelete(comment.id)}
                      disabled={Boolean(pending)}
                    >
                      {deleting ? "거두는 중…" : "거두기"}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-8 leading-8 text-ink-soft">
          아직 댓글이 없습니다. 짧은 한마디도 좋아요.
        </p>
      )}

      {error ? (
        <p className="mt-6 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      {signedIn ? (
        <form
          onSubmit={handleCreate}
          className={`${comments.length ? "mt-8 border-t border-line/80 pt-8" : "mt-8"}`}
        >
          <label className="block text-sm text-ink-soft" htmlFor="hobby-comment-body">
            한마디
          </label>
          <textarea
            id="hobby-comment-body"
            value={draft}
            rows={4}
            className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
            placeholder="짧은 한마디를 남겨 주세요."
            maxLength={COMMENT_BODY_MAX}
            disabled={pending === "create"}
            onChange={(event) => setDraft(event.target.value.slice(0, COMMENT_BODY_MAX))}
          />
          <p className="mt-2 text-xs tracking-wide text-ink-soft">
            {trimCommentBody(draft).length}/{COMMENT_BODY_MAX}
          </p>
          <button
            type="submit"
            className="btn-quiet mt-6 disabled:opacity-60"
            disabled={pending === "create"}
          >
            {pending === "create" ? "담는 중…" : "댓글 남기기"}
          </button>
        </form>
      ) : (
        <div
          className={`${comments.length ? "mt-8 border-t border-line/80 pt-8" : "mt-8"}`}
        >
          <p className="leading-8 text-ink-soft">
            들어와 있으면 이 글에 한마디를 남길 수 있습니다.
          </p>
          <Link href={loginHref(`/hobbies/post/${postId}`)} className="btn-quiet mt-6">
            들어와 댓글 남기기
          </Link>
        </div>
      )}
    </section>
  );
}
