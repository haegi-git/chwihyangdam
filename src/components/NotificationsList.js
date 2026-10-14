"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PersonFace from "@/components/PersonFace";
import { formatNotificationTime, notificationHref, notificationText } from "@/lib/notifications";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function NotificationsList({ items = [] }) {
  const router = useRouter();
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const unread = items.some((item) => !item.read_at);

  async function markRead(filter) {
    if (!isSupabaseConfigured()) {
      setError("저장소가 아직 연결되지 않았습니다.");
      return false;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("들어와 주시면 소식을 볼 수 있습니다.");
      return false;
    }

    let query = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .is("read_at", null);

    if (filter?.id) {
      query = query.eq("id", filter.id);
    }

    const { error: updateError } = await query;
    if (updateError) {
      setError("읽음으로 바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      return false;
    }

    return true;
  }

  async function handleMarkAll() {
    setPending("all");
    setError("");
    const saved = await markRead();
    setPending("");
    if (saved) {
      router.refresh();
    }
  }

  async function handleOpen(event, item) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    const href = notificationHref(item);
    setPending(item.id);
    setError("");

    if (!item.read_at) {
      await markRead({ id: item.id });
    }

    setPending("");
    router.push(href);
    router.refresh();
  }

  return (
    <div className="mt-12">
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-ghost"
          onClick={handleMarkAll}
          disabled={!unread || pending === "all"}
        >
          {pending === "all" ? "읽는 중…" : "모두 읽음"}
        </button>
      </div>

      {items.length ? (
        <ol className="mt-6 space-y-4">
          {items.map((item) => {
            const href = notificationHref(item);
            const unreadItem = !item.read_at;
            const actor = item.actor?.display_name?.trim() ? item.actor : { display_name: "누군가" };

            return (
              <li
                key={item.id}
                className={`paper-sheet rounded-[1.85rem] p-6 md:p-7 ${unreadItem ? "border-sage/40" : ""}`}
              >
                <PersonFace profile={actor} size="sm">
                  <span className="mt-1 block text-xs tracking-wide text-ink-soft">
                    <time dateTime={item.created_at}>{formatNotificationTime(item.created_at)}</time>
                    {unreadItem ? <span className="ml-2 text-sage-deep">새 소식</span> : null}
                  </span>
                </PersonFace>
                <Link
                  href={href}
                  onClick={(event) => handleOpen(event, item)}
                  className="mt-4 block leading-8 text-ink transition-colors duration-500 hover:text-sage-deep"
                >
                  {pending === item.id ? "여는 중…" : notificationText(item)}
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <section className="paper-sheet mt-6 rounded-[1.85rem] px-8 py-12 text-center md:px-12">
          <h2 className="display text-3xl text-ink">아직 도착한 소식이 없습니다</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-ink-soft">
            친구 요청과 댓글이 오면 이곳에 조용히 모입니다.
          </p>
        </section>
      )}

      {error ? (
        <p className="mt-5 text-sm leading-7 text-clay" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
