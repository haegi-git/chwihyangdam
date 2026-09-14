"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import HobbyAuthorLink from "@/components/HobbyAuthorLink";
import { formatDate } from "@/lib/dates";
import {
  COMMENT_BODY_MAX,
  commentWasEdited,
  groupHobbyCommentThreads,
  isTopLevelComment,
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
  const [replyingToId, setReplyingToId] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const signedIn = Boolean(currentUserId);
  const threads = groupHobbyCommentThreads(comments);
  const loginNext = `/hobbies/post/${postId}`;

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
      router.replace(loginHref(loginNext));
      return null;
    }

    return { supabase, user };
  }

  async function insertComment(body, parentId = null) {
    const session = await requireUser();

    if (!session) {
      return false;
    }

    const row = {
      post_id: postId,
      author_id: session.user.id,
      body,
    };

    if (parentId) {
      row.parent_id = parentId;
    }

    const { error: insertError } = await session.supabase.from("hobby_comments").insert(row);

    if (insertError) {
      return false;
    }

    return true;
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

    const saved = await insertComment(body);

    if (!saved) {
      fail("댓글을 남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setDraft("");
    setPending("");
    router.refresh();
  }

  async function handleReply(event, parentId) {
    event.preventDefault();

    const body = trimCommentBody(replyDraft);

    if (!body) {
      setError("한 줄을 적어 주세요.");
      return;
    }

    if (body.length > COMMENT_BODY_MAX) {
      setError(`댓글은 ${COMMENT_BODY_MAX}자까지 담을 수 있습니다.`);
      return;
    }

    setPending(`reply:${parentId}`);
    setError("");

    const saved = await insertComment(body, parentId);

    if (!saved) {
      fail("답글을 남기지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    setReplyDraft("");
    setReplyingToId("");
    setPending("");
    router.refresh();
  }

  function startEdit(comment) {
    setReplyingToId("");
    setReplyDraft("");
    setEditingId(comment.id);
    setEditDraft(comment.body);
    setError("");
  }

  function cancelEdit() {
    setEditingId("");
    setEditDraft("");
  }

  function startReply(commentId) {
    cancelEdit();
    setReplyingToId(commentId);
    setReplyDraft("");
    setError("");
  }

  function cancelReply() {
    setReplyingToId("");
    setReplyDraft("");
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

  async function handleDelete(comment, replyCount = 0) {
    const isReply = !isTopLevelComment(comment);
    const confirmed = window.confirm(
      isReply
        ? "이 답글을 거두어 둘까요? 글에서 사라집니다."
        : replyCount > 0
          ? "이 댓글을 거두어 둘까요? 아래에 달린 답글도 함께 사라집니다."
          : "이 댓글을 거두어 둘까요? 글에서 사라집니다.",
    );

    if (!confirmed) {
      return;
    }

    setPending(`delete:${comment.id}`);
    setError("");

    const session = await requireUser();

    if (!session) {
      return;
    }

    const { error: deleteError } = await session.supabase
      .from("hobby_comments")
      .delete()
      .eq("id", comment.id)
      .eq("author_id", session.user.id);

    if (deleteError) {
      fail("댓글을 거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    if (replyingToId === comment.id) {
      cancelReply();
    }

    if (editingId === comment.id) {
      cancelEdit();
    }

    setPending("");
    router.refresh();
  }

  const commentEntryProps = {
    currentUserId,
    signedIn,
    loginNext,
    pending,
    editingId,
    editDraft,
    setEditDraft,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onStartReply: startReply,
  };

  return (
    <section
      id="comments"
      className="paper-sheet rise-in rise-in-3 mt-8 rounded-[1.85rem] p-7 md:p-10"
    >
      <p className="kicker">댓글</p>
      <h2 className="display mt-5 text-3xl text-ink">
        {comments.length ? `댓글 ${comments.length}` : "댓글"}
      </h2>

      {threads.length ? (
        <ol className="mt-8 divide-y divide-line/80">
          {threads.map(({ comment, replies }) => {
            const isReplying = replyingToId === comment.id;
            const showReplyLane = replies.length > 0 || isReplying;

            return (
              <li key={comment.id} className="py-6 first:pt-2">
                <CommentEntry
                  comment={comment}
                  allowReply={isTopLevelComment(comment)}
                  isReplying={isReplying}
                  replyCount={replies.length}
                  {...commentEntryProps}
                />

                {showReplyLane ? (
                  <div className="mt-5 ml-1 space-y-5 border-l border-line/80 pl-5 md:pl-6">
                    {replies.length ? (
                      <ol className="space-y-5">
                        {replies.map((reply) => (
                          <li key={reply.id}>
                            <CommentEntry
                              comment={reply}
                              allowReply={false}
                              {...commentEntryProps}
                            />
                          </li>
                        ))}
                      </ol>
                    ) : null}

                    {isReplying ? (
                      <CommentComposer
                        id={`hobby-comment-reply-${comment.id}`}
                        label="답글"
                        placeholder="짧은 답을 남겨 주세요."
                        value={replyDraft}
                        rows={3}
                        pending={pending === `reply:${comment.id}`}
                        submitLabel="답글 남기기"
                        submittingLabel="담는 중…"
                        onChange={setReplyDraft}
                        onSubmit={(event) => handleReply(event, comment.id)}
                        onCancel={cancelReply}
                      />
                    ) : null}
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
        <CommentComposer
          id="hobby-comment-body"
          className={comments.length ? "mt-8 border-t border-line/80 pt-8" : "mt-8"}
          label="한마디"
          placeholder="짧은 한마디를 남겨 주세요."
          value={draft}
          rows={4}
          pending={pending === "create"}
          submitLabel="댓글 남기기"
          submittingLabel="담는 중…"
          onChange={setDraft}
          onSubmit={handleCreate}
        />
      ) : (
        <div
          className={comments.length ? "mt-8 border-t border-line/80 pt-8" : "mt-8"}
        >
          <p className="leading-8 text-ink-soft">
            들어와 있으면 이 글에 한마디를 남길 수 있습니다.
          </p>
          <Link href={loginHref(loginNext)} className="btn-quiet mt-6">
            들어와 댓글 남기기
          </Link>
        </div>
      )}
    </section>
  );
}

function CommentEntry({
  comment,
  allowReply = false,
  isReplying = false,
  replyCount = 0,
  currentUserId,
  signedIn,
  loginNext,
  pending,
  editingId,
  editDraft,
  setEditDraft,
  onStartEdit,
  onCancelEdit,
  onEdit,
  onDelete,
  onStartReply,
}) {
  const isOwner = currentUserId && currentUserId === comment.author_id;
  const isEditing = editingId === comment.id;
  const deleting = pending === `delete:${comment.id}`;
  const showOwnerActions = isOwner && !isEditing;
  const showReplyAction = allowReply && !isEditing && !isReplying;
  const showActions = showOwnerActions || showReplyAction;

  return (
    <article>
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
        <CommentComposer
          id={`hobby-comment-edit-${comment.id}`}
          className="mt-4"
          label={allowReply ? "댓글 고치기" : "답글 고치기"}
          labelClassName="sr-only"
          value={editDraft}
          rows={3}
          pending={pending === "edit"}
          submitLabel="담기"
          submittingLabel="담는 중…"
          onChange={setEditDraft}
          onSubmit={onEdit}
          onCancel={onCancelEdit}
        />
      ) : (
        <p className="mt-4 whitespace-pre-wrap leading-8 text-ink-soft">{comment.body}</p>
      )}

      {showActions ? (
        <div className="mt-4 flex flex-wrap gap-4">
          {showOwnerActions ? (
            <>
              <button
                type="button"
                className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline disabled:opacity-50"
                onClick={() => onStartEdit(comment)}
                disabled={Boolean(pending)}
              >
                고치기
              </button>
              <button
                type="button"
                className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline disabled:opacity-50"
                onClick={() => onDelete(comment, replyCount)}
                disabled={Boolean(pending)}
              >
                {deleting ? "거두는 중…" : "거두기"}
              </button>
            </>
          ) : null}
          {showReplyAction ? (
            signedIn ? (
              <button
                type="button"
                className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline disabled:opacity-50"
                onClick={() => onStartReply(comment.id)}
                disabled={Boolean(pending)}
              >
                답글
              </button>
            ) : (
              <Link
                href={loginHref(loginNext)}
                className="text-sm text-sage-deep underline-offset-8 transition-colors duration-500 hover:underline"
              >
                답글
              </Link>
            )
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CommentComposer({
  id,
  className = "",
  label,
  labelClassName = "block text-sm text-ink-soft",
  placeholder,
  value,
  rows = 3,
  pending = false,
  submitLabel,
  submittingLabel,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        className={`field-quiet resize-y rounded-2xl px-4 py-3 ${labelClassName.includes("sr-only") ? "" : "mt-2"}`}
        placeholder={placeholder}
        maxLength={COMMENT_BODY_MAX}
        disabled={pending}
        onChange={(event) => onChange(event.target.value.slice(0, COMMENT_BODY_MAX))}
      />
      <p className="mt-2 text-xs tracking-wide text-ink-soft">
        {trimCommentBody(value).length}/{COMMENT_BODY_MAX}
      </p>
      <div className={`flex flex-wrap gap-2 ${onCancel ? "mt-4" : ""}`}>
        <button
          type="submit"
          className={`btn-quiet disabled:opacity-60 ${onCancel ? "" : "mt-6"}`}
          disabled={pending}
        >
          {pending ? submittingLabel : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="btn-ghost disabled:opacity-60"
            onClick={onCancel}
            disabled={pending}
          >
            그만두기
          </button>
        ) : null}
      </div>
    </form>
  );
}
