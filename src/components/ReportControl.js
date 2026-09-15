"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REPORT_DETAIL_MAX,
  REPORT_DAILY_CAP,
  REPORT_REASONS,
  countReportsToday,
  reportErrorMessage,
  requestModerationAiDraft,
  trimReportDetail,
} from "@/lib/moderation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ReportControl({
  targetType,
  targetId,
  currentUserId = null,
  authorId = null,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const signedIn = Boolean(currentUserId);
  const isOwn = Boolean(currentUserId && authorId && currentUserId === authorId);

  if (!signedIn || isOwn) {
    return null;
  }

  function close() {
    setOpen(false);
    setReason("");
    setDetail("");
    setPending(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    if (!reason) {
      setError("이유를 하나 골라 주세요.");
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setPending(false);
      setError("들어와 있으면 살펴 달라고 할 수 있습니다.");
      return;
    }

    const used = await countReportsToday(supabase, user.id);

    if (used >= REPORT_DAILY_CAP) {
      setPending(false);
      setError("오늘은 충분히 살펴 달라고 해 주셨어요. 내일 다시 부탁해 주세요.");
      return;
    }

    const trimmed = trimReportDetail(detail);
    const { error: insertError } = await supabase.from("content_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: trimmed || null,
    });

    if (insertError) {
      setPending(false);
      setError(reportErrorMessage(insertError));
      return;
    }

    setMessage("살펴 보겠습니다. 고마워요.");
    setPending(false);
    close();
    void requestModerationAiDraft({ targetType, targetId });
    router.refresh();
  }

  return (
    <div className={open ? "w-full basis-full" : ""}>
      <button
        type="button"
        className="text-sm text-ink-soft underline-offset-8 transition-colors duration-500 hover:text-sage-deep hover:underline disabled:opacity-50"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
          setMessage("");
        }}
        disabled={pending}
        aria-expanded={open}
      >
        신고
      </button>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-[1.4rem] border border-line/80 bg-paper-deep/40 px-4 py-4"
        >
          <p className="text-sm leading-7 text-ink-soft">
            이 자리가 불편하다면, 이유를 하나만 골라 주세요. 바로 처벌하지 않고
            천천히 살펴 봅니다.
          </p>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">신고 이유</legend>
            {REPORT_REASONS.map((item) => (
              <label
                key={item.value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl px-1 py-1.5 text-sm text-ink"
              >
                <input
                  type="radio"
                  name={`report-reason-${targetType}-${targetId}`}
                  value={item.value}
                  checked={reason === item.value}
                  onChange={() => setReason(item.value)}
                  disabled={pending}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="mt-4 block text-sm text-ink-soft" htmlFor={`report-detail-${targetId}`}>
            짧은 설명 (선택)
          </label>
          <textarea
            id={`report-detail-${targetId}`}
            value={detail}
            rows={3}
            className="field-quiet mt-2 resize-y rounded-2xl px-4 py-3"
            placeholder="필요한 말만 짧게."
            maxLength={REPORT_DETAIL_MAX}
            disabled={pending}
            onChange={(event) => setDetail(event.target.value.slice(0, REPORT_DETAIL_MAX))}
          />
          <p className="mt-2 text-xs tracking-wide text-ink-soft">
            {trimReportDetail(detail).length}/{REPORT_DETAIL_MAX}
          </p>
          {error ? (
            <p className="mt-3 text-sm leading-7 text-clay" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="btn-quiet" disabled={pending}>
              {pending ? "담는 중…" : "보내기"}
            </button>
            <button type="button" className="btn-ghost" onClick={close} disabled={pending}>
              닫기
            </button>
          </div>
        </form>
      ) : null}

      {message ? (
        <p className="mt-3 text-sm leading-7 text-sage-deep" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
