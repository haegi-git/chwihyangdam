"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { authorLabel } from "@/lib/hobbies";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function AdminUsers({ query = "", rows = [] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function toggleSuspended(row) {
    const next = !row.suspended;
    const confirmed = window.confirm(
      next
        ? `${authorLabel(row)} 님을 정지할까요? 글과 댓글을 새로 남기지 못합니다.`
        : `${authorLabel(row)} 님의 정지를 풀까요?`,
    );

    if (!confirmed) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return;
    }

    setPendingId(row.id);
    setError("");
    const supabase = createClient();
    const { error: suspendError } = await supabase.rpc("set_profile_suspended", {
      target: row.id,
      next_suspended: next,
    });
    setPendingId("");

    if (suspendError) {
      setError("정지를 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form action="/admin" className="paper-sheet rounded-[1.85rem] p-6 md:p-7">
        <input type="hidden" name="tab" value="users" />
        <label className="block text-sm text-ink-soft" htmlFor="admin-user-q">
          닉네임
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="admin-user-q"
            name="q"
            defaultValue={query}
            className="field-quiet rounded-2xl px-4 py-3"
            placeholder="이름으로 찾기"
            maxLength={40}
          />
          <button type="submit" className="btn-quiet shrink-0">
            찾기
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length ? (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="paper-sheet rounded-[1.85rem] p-6 md:p-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-soft">
                <span className={row.suspended ? "text-clay" : "text-sage-deep"}>
                  {row.suspended ? "정지" : "활동"}
                </span>
                <span aria-hidden="true">·</span>
                <time dateTime={row.created_at}>{formatDate(row.created_at)}</time>
                <span aria-hidden="true">·</span>
                <span>글 {row.postCount}</span>
                <span>댓글 {row.commentCount}</span>
                <span>신고 {row.reportCount}</span>
              </div>
              <h2 className="display mt-3 text-3xl text-ink">
                <Link href={`/profile/${row.id}`} className="hover:text-sage-deep">
                  {authorLabel(row)}
                </Link>
              </h2>
              <button
                type="button"
                className="btn-ghost mt-5"
                onClick={() => toggleSuspended(row)}
                disabled={pendingId === row.id}
              >
                {pendingId === row.id ? "담는 중…" : row.suspended ? "정지 해제" : "정지"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <section className="paper-sheet rounded-[1.85rem] px-8 py-12 text-center">
          <h2 className="display text-3xl text-ink">찾는 사람이 없습니다</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">닉네임을 조금 바꿔 다시 찾아 보세요.</p>
        </section>
      )}
    </div>
  );
}
