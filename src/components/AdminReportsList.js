"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { authorLabel } from "@/lib/hobbies";
import {
  MODERATION_ACTIONS,
  moderationActionLabel,
  reportReasonLabel,
  requestModerationAiDraft,
} from "@/lib/moderation";
import { uniquePostImageUrls } from "@/lib/post-content";
import { removeOwnedPostImages } from "@/lib/post-images";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AdminReportsList({ items = [], aiConfigured = false }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function runDecision(item, action) {
    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    if (action === "removed") {
      const confirmed = window.confirm(
        item.target_type === "comment"
          ? "이 댓글을 거둘까요? 글에서 사라집니다. 사람은 막지 않습니다."
          : "이 글을 거둘까요? 목록에서 사라집니다. 사람은 막지 않습니다.",
      );

      if (!confirmed) {
        return;
      }
    }

    setPendingId(`${item.id}:${action}`);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPendingId("");
      setError("운영하는 분으로 들어와 주세요.");
      return;
    }

    const now = new Date().toISOString();
    const table = item.target_type === "comment" ? "hobby_comments" : "hobby_posts";

    if (action === "cleared") {
      const { error: updateError } = await supabase
        .from(table)
        .update({ hidden_at: null, hide_reason: null })
        .eq("id", item.target_id);

      if (updateError) {
        setPendingId("");
        setError("가림을 풀지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
    } else if (action === "keep_hidden") {
      const { error: updateError } = await supabase
        .from(table)
        .update({
          hidden_at: item.post?.hidden_at || item.comment?.hidden_at || now,
          hide_reason: "operator_keep_hidden",
        })
        .eq("id", item.target_id);

      if (updateError) {
        setPendingId("");
        setError("가림을 유지하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
    } else if (action === "removed") {
      if (item.target_type === "post" && item.post) {
        await removeOwnedPostImages(
          supabase,
          item.post.author_id,
          uniquePostImageUrls(item.post.image_urls),
        );
      }

      const { error: deleteError } = await supabase.from(table).delete().eq("id", item.target_id);

      if (deleteError) {
        setPendingId("");
        setError("거두지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
    }

    const { error: reviewError } = await supabase
      .from("moderation_reviews")
      .update({
        status: action,
        decided_by: user.id,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", item.id);

    if (reviewError) {
      setPendingId("");
      setError("결정은 반영했지만 목록을 비우지 못했습니다. 새로고침해 주세요.");
      return;
    }

    setPendingId("");
    router.refresh();
  }

  async function runAi(item) {
    if (!aiConfigured) {
      return;
    }

    setPendingId(`${item.id}:ai`);
    setError("");

    const result = await requestModerationAiDraft({
      targetType: item.target_type,
      targetId: item.target_id,
      force: true,
    });

    if (!result?.ok || result.missingKey) {
      setPendingId("");
      setError(
        result?.missingKey
          ? "AI 키를 .env.local에 넣으면 초안 의견을 받을 수 있어요"
          : "초안을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
      );
      return;
    }

    setPendingId("");
    router.refresh();
  }

  if (!items.length) {
    return (
      <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center md:px-12">
        <h2 className="display text-3xl text-ink">지금은 비어 있습니다</h2>
        <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
          다섯 명이 살펴 달라고 하면 이곳에 올라옵니다. 사람을 막지는 않습니다.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      <ol className="space-y-6">
        {items.map((item) => {
          const busy = pendingId.startsWith(`${item.id}:`);
          const preview = previewOf(item);
          const href = hrefOf(item);

          return (
            <li key={item.id} className="paper-sheet rounded-[1.85rem] p-7 md:p-9">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
                <span>{item.target_type === "comment" ? "댓글" : "글"}</span>
                <span aria-hidden="true">·</span>
                <span>{authorLabel(item.author)}</span>
                <span aria-hidden="true">·</span>
                <span>살펴 달라는 이 {item.distinct_report_count}명</span>
                <span aria-hidden="true">·</span>
                <time dateTime={item.updated_at}>{formatDate(item.updated_at)}</time>
              </div>

              <h2 className="display mt-5 text-3xl text-ink">{preview.title}</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-ink-soft">{preview.body}</p>

              {href ? (
                <Link
                  href={href}
                  className="mt-4 inline-flex text-sm text-sage-deep underline-offset-8 hover:underline"
                >
                  원문으로
                </Link>
              ) : (
                <p className="mt-4 text-sm text-ink-soft">원문은 이미 거두어졌을 수 있습니다.</p>
              )}

              {item.reasons?.length ? (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {item.reasons.map((reason) => (
                    <li
                      key={reason.value}
                      className="rounded-full bg-sage-mist px-3 py-1 text-xs tracking-wide text-sage-deep"
                    >
                      {reason.label} {reason.count}
                    </li>
                  ))}
                </ul>
              ) : null}

              {item.reports?.some((report) => report.detail) ? (
                <ul className="mt-4 space-y-2 text-sm leading-7 text-ink-soft">
                  {item.reports
                    .filter((report) => report.detail)
                    .map((report) => (
                      <li key={report.id}>
                        {reportReasonLabel(report.reason)} — {report.detail}
                      </li>
                    ))}
                </ul>
              ) : null}

              <div className="mt-8 rounded-[1.4rem] border border-line/80 bg-paper-deep/35 px-5 py-5">
                <p className="text-xs tracking-[0.18em] text-sage-deep">AI 초안 · 참고만</p>
                {aiConfigured ? (
                  item.ai_summary ? (
                    <div className="mt-3">
                      <p className="leading-8 text-ink-soft">{item.ai_summary}</p>
                      <p className="mt-3 text-sm text-ink-soft">
                        제안: {moderationActionLabel(item.ai_suggested_action)}
                        {item.ai_label ? ` · ${reportReasonLabel(item.ai_label) || item.ai_label}` : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 leading-8 text-ink-soft">
                      아직 초안이 없습니다. 받아 두어도 결정은 사람이 합니다.
                    </p>
                  )
                ) : (
                  <p className="mt-3 leading-8 text-ink-soft">
                    AI 키를 .env.local에 넣으면 초안 의견을 받을 수 있어요
                  </p>
                )}
                {aiConfigured ? (
                  <button
                    type="button"
                    className="btn-ghost mt-4"
                    onClick={() => runAi(item)}
                    disabled={busy}
                  >
                    {pendingId === `${item.id}:ai` ? "받는 중…" : "AI 의견 받기"}
                  </button>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <p className="text-sm leading-7 text-ink-soft">
                  사람을 막거나 하루 정지를 하지는 않습니다. 이 글만 살핍니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {MODERATION_ACTIONS.map((action) => (
                    <button
                      key={action.value}
                      type="button"
                      className={action.value === "cleared" ? "btn-quiet" : "btn-ghost"}
                      title={action.hint}
                      onClick={() => runDecision(item, action.value)}
                      disabled={busy}
                    >
                      {pendingId === `${item.id}:${action.value}` ? "담는 중…" : action.label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function previewOf(item) {
  if (item.post) {
    return {
      title: item.post.title || "글",
      body: clip(item.post.body),
    };
  }

  if (item.comment) {
    return {
      title: "댓글",
      body: clip(item.comment.body),
    };
  }

  return {
    title: item.target_type === "comment" ? "댓글" : "글",
    body: "미리보기를 읽지 못했습니다.",
  };
}

function hrefOf(item) {
  if (item.post?.id) {
    return `/hobbies/post/${item.post.id}`;
  }

  if (item.comment?.post_id) {
    return `/hobbies/post/${item.comment.post_id}#comments`;
  }

  return "";
}

function clip(value, max = 280) {
  const text = String(value ?? "").trim();

  if (text.length <= max) {
    return text || "본문이 비어 있습니다.";
  }

  return `${text.slice(0, max).trim()}…`;
}
